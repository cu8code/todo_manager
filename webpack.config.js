const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'todo_manager.bundle.js',
  },
  mode:"production",
  target:"node"
};
