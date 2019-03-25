#!/usr/bin/env node

var lifecycleEvent = process.env.npm_lifecycle_event

if (!lifecycleEvent) {
  console.error(`
  linky ERR! It seems you may be running linky from the command-line directly.
  At this time, linky can only be run within an npm script specified in your package.json.

  Example package.json entry:

    "scripts": {
      "links:setup": "linky",
    },
    "links": {
      "@pkg/name": "../pkg/path"
    },
    "devLinks": {
      "@otherPkg/name": "../otherPkg/path"
    },

  Then exercise your linking power like:
    npm run links:setup                          // for linking "links" and "devLinks"
    NODE_ENV=production npm run links:setup      // for linking only "links"
`)
} else {
  const linky = require('./lib/linky')
  return linky(lifecycleEvent, process.env.NODE_ENV)
}
