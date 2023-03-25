const axios = require("axios")
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const fs = require("node:fs/promises")
const commander = require("commander")

const VERIFICATION = "https://github.com/login/device/code"
const AUTHORIZATION = "https://github.com/login/oauth/access_token"
const CLIENT_ID = "Iv1.20bd8ed69009c678"
const CONFIG_PATH = process.env.HOME + "/.config/todo_manger/config"
let token = null;

const program = new commander.Command()

program
  .name("todo_manger")
  .description("a cli tool to convert all yout project TODO into github issue")
  .version('0.1')

program.parse()

const current_dir = process.cwd()

// async function get_token(){
//   if(!fs.existsSync(CONFIG_PATH)){
//     const res = await fs.mkdir(CONFIG_PATH)
//     await sign_in()
//   }
// }
async function main() {
  console.log(await sign_in())
}

main()

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function sign_in() {
  const res = await axios.post(VERIFICATION, {
    "client_id": CLIENT_ID,
    "scope": "repo"
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
    }

    // TODO: store the auth_code
    if (res.data.access_token) {
      is_running = false
      return res.data.access_token
    }

    console.log("wating ....")
    await delay(interval * 1000)
  }
}

async function get_github_url() {
  let url = null
  let { stdout } = await exec(`cd ${current_dir} && git remote get-url origin`)
  stdout = stdout.slice("git@github.com:".length)
  stdout = stdout.slice(0, -".git".length)
  // TODO: the repo_name ends with a "." ( it should not )
  stdout = stdout.slice(0, -1)
  const [user_name, repo_name] = stdout.split('/')
  url = "https://api.github.com/repos" + "/" + user_name + "/" + repo_name + "/issues"
  console.log("user_name = ", user_name)
  console.log("repo_name = ", repo_name)
  console.log("url = ", url)
  return url
}

async function create_issue(url, title, body, token) {
  await axios.post(url, {
    title,
    body
  }, {
    header: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "assignees": ["todo_manager"],
      "milestone": 1,
      "labels": ["TODO"]
    }
  })
}


async function main() {
  const { stdout } = await exec(`git ls-tree --full-tree --name-only -r HEAD`)
  const arr = stdout.split("\n")
  const url = await get_github_url()
  // const token = await sign_in()
  arr.pop()
  for (const i of arr) {
    try {
      const data = await fs.readFile(current_dir + "/" + i, "utf8")
      const match = data.match(/\/\/\s*TODO:\s*(.*)/g)
      if (null !== match) {
        if (typeof match === "string") {
          match = match.replace(/\/\/\s*TODO:/, "").trim();
          create_issue(url, match, "", "ghu_oRkB1IHH6ZbUsLZXJOnScjlfnwm5Q20Tj8MJ")
        } else if (Array.isArray(match)) {
          for (let i of match) {
            i = i.replace(/\/\/\s*TODO:/, "").trim();
            create_issue(url, i, "", "ghu_oRkB1IHH6ZbUsLZXJOnScjlfnwm5Q20Tj8MJ")
          }
        }
      }
    } catch (e) {
      console.log("skipping... " + i)
      continue
    }
  }
}

