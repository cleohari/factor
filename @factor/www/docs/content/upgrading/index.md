---
title: Upgrading Factor
description: How to upgrade Factor to the latest version.
---

Upgrading Factor is easy. Normally it just involves upgrading your packages, but there are sometimes caveats.

## Before You Upgrade

- Factor follows the [semver](https://semver.org/) standard for releases. All upgrades should be considered non-breaking, unless they are major updates; (and even then changes are typically minor breaking changes.)
- Before you upgrade, you may want to reference the [changelog](./changelog). This may explain any issues or functionality that may change once you've upgraded.

## Upgrading with NPM or Yarn

```bash
yarn upgrade
# or
npm update
```

If you have issues, something may be caching or "locked" at an inappropriate version. To fix:

1. Delete `yarn.lock` or `package-lock.json`
2. Delete `node_modules` folder
3. Run install command

## Updating in Package.json

Your `package.json` file is what specifies which version of Factor and its plugins should be installed. You can also manually update versions there if you prefer.

> **Understanding ^ in versions**
> Most versions in `package.json` use the (^) "caret" marker. This specifies that the package should be upgraded unless the package is a major release. Since major releases are the only "breaking" releases, this is why using the (^) makes sense
