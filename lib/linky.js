const process = require('process')
const Package = require('./package')

const linky = (lifecycleEvent, env) => {
  const pkg = new Package(process.cwd())
  switch (lifecycleEvent) {
    case 'links:setup':
      return pkg.setupLinks(env)
    case 'links:install':
      return pkg.installLinks(env)
    default:
      throw new Error(`unknown script key: ${lifecycleEvent}`)
  }
}

module.exports = linky
