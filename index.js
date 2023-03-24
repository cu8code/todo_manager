const axios = require("axios")
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const fs = require("node:fs/promises")

// const https = require("https")

const VERIFICATION = "https://github.com/login/device/code"
const AUTHORIZATION = "https://github.com/login/oauth/access_token"
const CLIENT_ID = "Iv1.20bd8ed69009c678"

const current_dir = process.cwd()

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const sign_in = async () => {
  const res = await axios.post(VERIFICATION, {
    "client_id": CLIENT_ID,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
  const device_code = res.data.device_code
  const user_code = res.data.user_code
  const verification_uri = res.data.verification_uri
  const expires_in = res.data.expires_in
  const interval = res.data.interval

  console.log("open this link in browser: " + verification_uri)
  console.log("and enter this code: " + user_code)

  const start = new Date()
  let is_running = true
  while (is_running) {
    let res
    try {
      res = await axios.post(AUTHORIZATION, {
        client_id: CLIENT_ID,
        device_code: device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
    } catch (e) {
      if (new Date() - start < expires_in * 1000) {
        console.log("FAILED: token expired")
        break
      }
      console.log("FAILED: retrying....")
    }
    // TODO: store the auth_code
    if (undefined !== res.access_token) {
      is_running = false
      break
    }
    await delay(interval * 1000)
  }
}



const get_github_url = async () => {
  let url = null
  const { stdout } = await exec(`cd ${current_dir} && git remote get-url origin`)
  stdout = stdout.slice("git@github.com:".length)
  stdout = stdout.slice(0, -".git".length)
  // TODO: the repo_name ends with a "." ( it should not )
  stdout = stdout.slice(0, -1)
  const [user_name, repo_name] = stdout.split('/')
  url = "https://api.github.com/repos" + "/" + user_name + "/" + repo_name + "/issue"
  console.log("user_name = ", user_name)
  console.log("repo_name = ", repo_name)
  console.log("url = ", url)
  return url
}

const get_file = async () => {
  const { stdout } = await exec(`git ls-tree --full-tree --name-only -r HEAD`)
  const arr = stdout.split("\n")
  arr.pop()
  for (const i of arr){
    const f = await fs.stat(i)
    if(f.isDirectory()){

    } else if(f.isFile()){
      const data = await fs.readFile("./"+i)


    }
  }
}
get_file()


// const req = https.request(OPTIONS, (res) => {
//   console.log(res)
// })

// fetch(VERIFICATION, {
//   method: 'POST',
//   body: JSON.stringify(:w
  //   {
//     "client_id": CLIENT_ID
//   }),
//   headers: {
//     'Content-type': 'application/json;',
//     'Accept': 'application/json'
//   }
// }).then(res => {
//   console.log(res)
// })





// TODO: Create a test case
