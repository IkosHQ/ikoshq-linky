const fs = require('fs')
const path = require('path')
const { cd, linkExists, log, run } = require('./util')

const ENV_DEVELOPMENT = 'development'
const ENV_PRODUCTION = 'production'

let installedLinks = []
let installableLinks = []

const extractLinks = (dependencies = {}) => Object.keys(dependencies).reduce(
  (c, k) => Object.assign(
    c,
    (dependencies[k].indexOf('link:') === 0 || dependencies[k].indexOf('file:') === 0)
      ? { [k]: dependencies[k].replace(/link:/ig, '').replace(/file:/ig, '') }
      : {}
  ),
  {}
)

class Package {
  constructor(path, depth = 0) {
    this.path = path
    this.depth = depth
    this._cache = {}
  }

  log(msg, logOpts = {}) {
    const defaults = {
      label: this.name(),
      indent: this.depth,
    }
    log(msg, Object.assign(defaults, logOpts))
  }

  jsonPath() {
    return path.join(this.path, 'package.json')
  }

  cacheGet(key, setter = null) {
    if (!this._cache[key] && setter) {
      this._cache[key] = setter()
    }
    return this._cache[key]
  }

  json() {
    return this.cacheGet('json', () => JSON.parse(fs.readFileSync(this.jsonPath())))
  }

  name() {
    return this.json().name
  }

  prodLinks() {
    return Object.assign(
      // anything defined under "links" is a link
      this.json().links || {},
      // anything defined under "dependencies" which starts with "link:" is a link
      extractLinks(this.json().dependencies) || {}
    )
  }

  devLinks() {
    return Object.assign(
      this.json().devLinks || {},
      extractLinks(this.json().devDependencies) || {}
    )
  }

  async isLinked() {
    return this.cacheGet('isLinked', () => linkExists(this.name()))
  }

  links(env) {
    return this.cacheGet('links', () => {
      const allLinks = Object.assign(
        this.prodLinks(),
        env !== ENV_PRODUCTION ? this.devLinks() : {}
      )
      return Object.keys(allLinks).reduce(
        (c, x) => Object.assign(c, {
          [x]: new Package(path.join(this.path, allLinks[x]), this.depth + 2)
        }), {}
      )
    })
  }

  async link(requiree, env) {
    this.log(`Linking package: ${this.name()} (required by ${requiree})`)
    await cd(this.path, async () => {
      // recurse; continue considering the setting up of links
      // that have been defined in the package's "links"/"devLinks" keys
      await this.setupLinks(env)
      return await run('npm', ['link'])
    })
    this.log(`DONE Linking package\n`)
    return
  }

  /**
   * Traverse this package's link graph and issue
   * an install command for each uninstalled link.
   */
  async installLinks(env, requiree = null) {
    const links = this.links(env)
    installableLinks = [
      ...new Set([
        ...installableLinks,
        ...Object.keys(links)
      ])
    ].filter(name => !installedLinks.includes(name))

    if (requiree && !installableLinks.includes(this.name())) {
      this.log(`Not re-installing ${this.name()}`)
      return
    }

    if (Object.keys(links).length === 0) {
      this.log('No linked dependencies found.')
    } else {
      this.log(`Installing linked dependencies: ${Object.keys(links)}`)
      await Object.values(links)
        .reduce(
          // reduce to gain serial control of subprocess sequencing
          (c, pkg) => c.then(async () => {
            await pkg.installLinks(env, this.name(), installableLinks, installedLinks)
          }),
          Promise.resolve()
        )
      this.log(`DONE installing ${this.name()} dependencies`)
    }
    if (requiree) {
      this.log(`Installing ${this.name()} because it is a linked dependency of ${requiree}`)
      process.chdir(this.path)
      await run('yarn', ['install', '--ignore-scripts'], { indent: this.depth + 2, log: true })
      this.log(`DONE installing ${this.name()}`)
    }

    // when this is installed, mark it as such boi!!
    installableLinks = installableLinks.filter(
      name => name !== this.name()
    )
    installedLinks.push(this.name())
  }

  async setupLinks(env) {
    const links = this.links(env)
    if (Object.keys(links).length === 0) {
      return this.log('No linked dependencies found.')
    }
    this.log(`Setting up linked dependencies: ${Object.keys(links)}`)
    return Object.values(links)
      .reduce(
        // reduce to gain serial control of subprocess sequencing
        (c, pkg) => c.then(async () => {
          if (!await pkg.isLinked()) {
            // if this dependency is not discovered in the global
            // link bucket, it won't be linkable. So link it now.
            // This makes the operation resilient against missing/
            // disappeared/not-yet-defined links.
            // Also, use production mode for linking any dependencies;
            // the usual convention is that dependencies/libs should only expose
            // their package.json's `dependencies` when being consumed.
            await pkg.link(this.name(), env)
          }
          // after creating the linking the dependency, it can be
          // linked here in the consumer package.
          await run('npm', ['link', pkg.name()], {
            indent: this.depth + 2,
            log: true,
          })
        }),
        Promise.resolve()
      )
      .then(() => this.log(`DONE linking dependencies`))
  }
}

module.exports = Package
