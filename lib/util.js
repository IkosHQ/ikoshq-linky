const fs = require('fs')
const path = require('path')
const process = require('process')
const { spawn } = require('child_process')
const { createLogger, format, transports } = require('winston');
const { colorize, combine, timestamp, label, printf } = format;
const { cyan, yellow } = require('colors')


const indent = (msg, spaces = 0) => `${' '.repeat(spaces)}${msg}`

const log = (msg, logOpts = {}) => {
  const myFormat = printf(({ label, message }) => {
    const msg = `${label}${logOpts.label ? yellow(`[${logOpts.label}]`) : ''} ${message}`
    return indent(msg, logOpts.indent)
  });
  
  const logger = createLogger({
    level: 'info',
    // format: format.json(),
    format: combine(
      label({ label: cyan('[linky]') }),
      timestamp(),
      myFormat
    ),
    transports: [
      new transports.Console({
        format: combine(
          colorize(),
          myFormat
        )
      })
    ]
  });

  return logger.info(`${msg}`)
}

const cd = async (dir, fn) => {
  const originalCwd = process.cwd()
  process.chdir(dir)
  await fn()
  process.chdir(originalCwd)
  return
}

const run = (cmd, args, opts = { indent: 0, log: false }) => new Promise((resolve, reject) => {
  const proc = spawn(cmd, args, opts)
  let stdout = ''
  let stderr = ''
  const splitToLines = (line, limit = 80) => {
    const pattern = new RegExp(`.{1,${limit}}`, "g")
    return line.match(pattern).map(x => indent(x, opts.indent)).join('\n') + '\n'
  }
  
  if (opts.log) {
    proc.stdout.on('data', data => console.log(splitToLines(data.toString())))
    proc.stderr.on('data', data => console.error(splitToLines(data.toString())))
  }
  proc.stdout.on('data', data => stdout += data.toString())
  proc.stderr.on('data', data => stderr += data.toString())
  proc.on('close', code => code === 0
    ? resolve(stdout.trim())
    : reject(stderr.trim())
  )
})

const npmRoot = () => run('npm', ['root', '-g'])

const linkExists = async pkgName => {
  const root = await npmRoot()
  return fs.existsSync(path.join(root, pkgName))
}

module.exports = { cd, linkExists, log, run }
