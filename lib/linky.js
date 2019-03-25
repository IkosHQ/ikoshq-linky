const process = require('process')
const Package = require('./package')

const linky = (lifecycleEvent, env = 'development') => {
  const package = new Package(process.cwd())
  switch (lifecycleEvent) {
    case 'links:setup': 
      return package.setupLinks(env)
    default:
      throw new Error(`unknown script key: ${lifecycleEvent}`)
  }
}

module.exports = linky
