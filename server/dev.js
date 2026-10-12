import { spawn } from 'node:child_process'

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(process.execPath, ['server/index.js'], { stdio: 'inherit' }),
  spawn(command, ['run', 'dev:client'], { stdio: 'inherit', shell: process.platform === 'win32' }),
]

function stop() {
  for (const child of children) child.kill()
  process.exit()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const child of children) child.on('exit', code => { if (code && code !== 0) stop() })
