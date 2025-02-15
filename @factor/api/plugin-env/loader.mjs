/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-console */
import { URL, pathToFileURL, fileURLToPath } from "url"
import fs from "fs"
import path from "path"
import { transformSync, build } from "esbuild"

const isWindows = process.platform === "win32"

const imgExtensionsRegex = /\.(webp|svg|jpg|png|gif|vue)$/
const tsExtensionsRegex = /\.m?(tsx?|json)$/

const esbuildResolve = async (id, dir) => {
  let result

  await build({
    stdin: {
      contents: `import ${JSON.stringify(id)}`,
      resolveDir: dir,
    },
    write: false,
    bundle: true,
    treeShaking: false,
    ignoreAnnotations: true,
    platform: "node",
    plugins: [
      {
        name: "resolve",
        setup({ onLoad }) {
          onLoad({ filter: /.*/ }, (args) => {
            result = args.path
            return { contents: "" }
          })
        },
      },
    ],
  })
  return result
}

const esbuildTransformSync = (rawSource, filename, url, format) => {
  const {
    code: js,
    warnings,
    map: jsSourceMap,
  } = transformSync(rawSource.toString(), {
    sourcefile: filename,
    sourcemap: "both",
    loader: new URL(url).pathname.match(tsExtensionsRegex)[1],
    target: `node${process.versions.node}`,
    format: format === "module" ? "esm" : "cjs",
  })

  if (warnings && warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(warning.location)
      console.warn(warning.text)
    }
  }

  return { js, jsSourceMap }
}

const getTsCompatSpecifier = (parentURL, specifier) => {
  let tsSpecifier
  let search

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    // Relative import
    const url = new URL(specifier, parentURL)
    tsSpecifier = fileURLToPath(url).replace(/\.tsx?$/, "")
    search = url.search
  } else {
    // Bare import
    tsSpecifier = specifier

    const url = new URL(specifier, parentURL)

    search = url.search
  }

  return {
    tsSpecifier,
    search,
  }
}

const isValidURL = (s) => {
  try {
    return !!new URL(s)
  } catch (error) {
    if (error instanceof TypeError) return false

    throw error
  }
}

export const resolve = async (specifier, context, nextResolve) => {
  const { parentURL } = context

  let url

  // According to Node's algorithm, we first check if it is a valid URL.
  // When the module is the entry point, node will provides a file URL to it.
  if (isValidURL(specifier)) {
    url = new URL(specifier)
  } else {
    // Try to resolve the module according to typescript's algorithm,
    // and construct a valid url.

    const parsed = getTsCompatSpecifier(parentURL, specifier)

    const _path = await esbuildResolve(
      parsed.tsSpecifier,
      path.dirname(fileURLToPath(parentURL)),
    )
    if (_path) {
      url = pathToFileURL(_path)
      url.search = parsed.search
    }
  }

  if (url) {
    // If the resolved file is typescript
    if (tsExtensionsRegex.test(url.pathname)) {
      return {
        shortCircuit: true,
        url: url.href,
        format: "module",
      }
    }
    // https://github.com/nodejs/modules/issues/488#issuecomment-589541566
    else if (/^file:\/{3}.*\/bin\//.test(url.href) && !path.extname(url.href)) {
      return {
        shortCircuit: true,
        url: url.href,
        format: "commonjs",
      }
    }

    // Else, for other types, use default resolve with the valid path
    return nextResolve(url.href, context, nextResolve)
  }

  return nextResolve(specifier, context, nextResolve)
}

// New hook starting from Node v16.12.0
// See: https://github.com/nodejs/node/pull/37468
export const load = (url, context, nextLoad) => {
  // if an image, just return the file name
  if (imgExtensionsRegex.test(new URL(url).pathname)) {
    const fn = new URL(url).pathname.replace(/^.*[/\\]/, "")
    return {
      shortCircuit: true,
      format: "module",
      source: `export default "${fn}"`,
    }
  }

  if (tsExtensionsRegex.test(new URL(url).pathname)) {
    const { format } = context

    let filename = url
    if (!isWindows) filename = fileURLToPath(url)

    const rawSource = fs.readFileSync(new URL(url), { encoding: "utf8" })
    const { js } = esbuildTransformSync(rawSource, filename, url, format)

    return {
      shortCircuit: true,
      format: "module",
      source: js,
    }
  }

  // Let Node.js handle all other format / sources.
  return nextLoad(url, context, nextLoad)
}
