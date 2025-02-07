import path from "path"
import deepMergeUtility from "deepmerge"
import stableStringify from "fast-safe-stringify"
import md5 from "spark-md5"
import { customAlphabet } from "nanoid"
import { isPlainObject } from "is-plain-object"
import { ListItem, PriorityItem } from "../types"
import stopwordsLib from "../resource/stopwords"
import { isNode } from "./vars"
import { regExpEscape } from "./regex"
/**
 * Safely get the dirname with import.meta.url
 * This variable is undefined in SSR so needs to be checked
 */
export const safeDirname = (url?: string, relativePath = ""): string => {
  if (!url) return ""
  return path.join(new URL(".", url).pathname, relativePath)
}
export const safeUrl = (url?: string): URL | undefined => {
  if (!url) return
  try {
    const u = new URL(url)
    return u
  } catch {
    console.warn(`url is invalid: ${url}`)
    return undefined
  }
}

export const stringify = (data: unknown): string =>
  stableStringify(
    data,
    (_key, value): unknown => {
      if (value === "[Circular]") return
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      else return value
    },
    2,
  )
/**
 * Stringify and hash
 * https://github.com/joliss/fast-js-hash-benchmark
 */
type HashObject = Record<string, any> | any[] | string | number
export const fastHash = (data: HashObject): string => {
  return md5.hash(stableStringify(data)).toString()
}
/**
 * Use hash to determine if two objects are the same
 */
export const hashEqual = (a?: HashObject, b?: HashObject): boolean => {
  return fastHash(a || {}) == fastHash(b || {})
}
/**
 * Standard format globally unique ID
 */
export const uuid = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.trunc(Math.random() * 16),
      v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
/**
 * Gets a short ID consisting only of lowercase letters
 * @note
 *  - needed in DB, lowercase only means it's immune to transforms of case (snake_case to camelCase)
 */
export const shortId = (): string => {
  return customAlphabet("abcdefghijklmnopqrstuvwxyz123456789", 10)()
}
/**
 * Get a universal global this object
 */
export const getGlobalThis = (): any => {
  return typeof window != "undefined" ? window : global
}

/**
 * Detect if visitor is actually a search bot
 */
export const isSearchBot = (): boolean => {
  if (typeof window == "undefined" || !window.navigator) {
    return false
  }
  const result =
    /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex/i.test(
      window.navigator.userAgent,
    )

  return result
}
/**
 * Wait for specific amount of time
 * @param ms - milliseconds
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms || 0))
}
/**
 * Turns a full name into firstName and lastName approx
 * @param fullName - a full name
 */
export const splitDisplayName = (
  fullName?: string,
): { firstName: string; lastName: string } => {
  const nameArray = fullName ? fullName.split(" ") : []

  let firstName = ""
  let lastName = ""
  if (nameArray.length > 0) {
    firstName = nameArray[0]
  }

  if (nameArray.length > 1) {
    const lastItem = nameArray.pop()
    lastName = lastItem || ""
  }

  return { firstName, lastName }
}
/**
 * Returns a global process based working directory if argument cwd is undefined
 * @param cwd - working directory
 */
export const getWorkingDirectory = (cwd?: string): string => {
  return cwd || process.env.FACTOR_CWD || process.cwd()
}

export const objectId = (idLength = 16): string => {
  const nts = (s: number): string => Math.floor(s).toString(idLength)
  return (
    nts(Date.now() / 1000) +
    " ".repeat(idLength).replace(/./g, () => nts(Math.random() * idLength))
  )
}
export const randomBetween = (
  min: number,
  max: number,
  decimalPlaces = 0,
): number => {
  const rand = Math.random() * (max - min) + min
  const power = Math.pow(10, decimalPlaces)
  return Math.floor(rand * power) / power
}
/**
 * Ensure there is a slash at end of string
 * @param path
 */
export const ensureTrailingSlash = (path: string): string => {
  path += path.endsWith("/") ? "" : "/"
  return path
}
// Sort objects in an array by a priority value that defaults to 100
export const sortPriority = <T extends { priority?: number }[]>(arr: T): T => {
  if (!arr || arr.length === 0) return arr

  return arr.sort((a, b) => {
    const ap = a.priority || 100
    const bp = b.priority || 100

    let result = 0

    if (ap < bp) {
      result = -1
    } else if (ap > bp) {
      result = 1
    }

    return result
  })
}
/**
 * Parse settings using dot notation
 * @param key - dot.notation pointer to settings
 * @param settings - object - all settings object
 * @remarks
 * Cases: [port] [app.name] [roles.arpowers@gmail.com]
 */
export const dotSetting = <T = unknown>({
  key,
  settings,
}: {
  key: string
  settings: Record<string, any>
}): T | undefined => {
  const currentKey = key.slice(0, key.indexOf("."))
  const subKeys = key.slice(key.indexOf(".") + 1)

  if (typeof settings[key] !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return settings[key]
  } else if (typeof settings[currentKey] == "object") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return dotSetting({ key: subKeys, settings: settings[currentKey] })
  } else {
    return undefined
  }
}
/**
 * Deep merge an array of objects into a single object
 *
 * @remarks
 * If two settings are arrays, then we have a special merge strategy
 * If the lower priority array has objects with _item or _ attribute,
 * then we merge with the higher priority array if it has object w same _item or _
 */
export const deepMerge = <T extends Record<string, any>>(
  items: (T | Partial<T> | undefined)[],
  options: {
    mergeArrays?: boolean
    isMergeableObject?: (o: any) => boolean
    plainOnly?: boolean
  } = {},
): T => {
  const mergeItems = items.filter(Boolean) as T[]

  const mergeOptions: deepMergeUtility.Options = {
    arrayMerge: (lowerPriority: unknown[], higherPriority: unknown[]) => {
      if (options.mergeArrays) {
        return [...higherPriority, ...lowerPriority]
      }
      return higherPriority
    },
  }

  if (options.plainOnly) {
    mergeOptions.isMergeableObject = isPlainObject
  } else if (options.isMergeableObject) {
    mergeOptions.isMergeableObject = options.isMergeableObject
  }

  const merged: T = deepMergeUtility.all(mergeItems, mergeOptions) as T

  return merged
}
/**
 * merges all and concatenates arrays
 */
export const deepMergeAll = <T extends Record<string, any>>(
  items: (Partial<T> | undefined)[],
): T => {
  const i = items.filter(Boolean) as T[]

  return deepMerge<T>(i, { mergeArrays: true })
}

/**
 * Merges an array of objects, but first sorts them by priority attr
 * @param arr - array of objects w priority key
 */
export const sortMerge = (arr: PriorityItem[]): Record<string, any> => {
  return deepMerge(sortPriority(arr))
}

/**
 * Make stop words lower case in a title
 * @param str - string to manipulate
 * @param lib - stopwords array
 */
export const stopWordLowercase = (str: string, lib: string[] = []): string => {
  if (lib.length === 0) {
    lib = stopwordsLib
  }

  const words = str.split(" ")

  if (words.length <= 1) return str

  const regex = new RegExp("\\b(" + lib.join("|") + ")\\b", "gi")

  return str.replace(regex, (match) => match.toLowerCase())
}

export const camelToUpperSnake = (string: string): string => {
  return string
    .replace(/\w([A-Z])/g, function (m) {
      return m[0] + "_" + m[1]
    })
    .toUpperCase()
}
/**
 * Convert camel-case to kebab-case
 * @param string - string to manipulate
 */
export const camelToKebab = (string: string): string => {
  return !string
    ? string
    : string.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
}

/**
 * Coverts a slug or variable into a title-like string
 */
export const toLabel = (str?: string): string => {
  if (!str || typeof str !== "string") return ""

  const label = camelToKebab(str)
    .replace(new RegExp("-|_", "g"), " ") // turn dashes to spaces
    .replace(/\//g, " ") // remove slashes and special chars
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim()

  return stopWordLowercase(label, ["and", "an", "a", "the", "or", "am", "to"])
}

/**
 * Converts regular space delimited text into a hyphenated slug
 */
export const slugify = (text?: string): string => {
  if (!text) return ""

  return text
    .toString()
    .toLowerCase()
    .replace(/[^\dA-Za-z]/g, "")
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/^\d+/g, "") // Remove Numbers
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/(\?|:)/g, "") // remove colons and question marks
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, "") // Trim - from end of text
}
/**
 * Turns a PascaleCase or camelCase into snake_case
 */
export const snakeCase = (text: string): string => {
  return text.replace(/([A-Z])/g, "_$1").toLowerCase()
}
/**
 * Turn a string into camelCase @todo .. doesn't work on snake_case
 */
export const camelize = (str?: string): string => {
  if (!str) return ""

  return str
    .replace(/^\w|[A-Z]|\b\w/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/\s|-/g, "")
}

export const camelCase = (str: string) => {
  return str.replace(/[._-](\w|$)/g, function (_, x: string) {
    return x.toUpperCase()
  })
}
/**
 * Camelize keys in an object
 */
export const camelKeys = function (obj: unknown): unknown {
  if (obj === Object(obj) && !Array.isArray(obj) && typeof obj !== "function") {
    const n: Record<string, unknown> = {}
    const o = obj as Record<string, unknown>
    Object.keys(o).forEach((k) => {
      n[camelCase(k)] = camelKeys(o[k])
    })

    return n
  } else if (Array.isArray(obj)) {
    const o = obj as unknown[]
    return o.map((i) => {
      return camelKeys(i)
    })
  }

  return obj
}

/**
 * Returns object keys in snake_case
 */
export const snakeCaseKeys = (
  original: Record<string, any>,
): Record<string, any> => {
  const newObject: Record<string, any> = {}
  for (const camel in original) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    newObject[snakeCase(camel)] = original[camel]
  }
  return newObject
}
/**
 * Parse to standard utility lists
 * Standard format for passing around config data and lists (inputs, etc.. )
 */
export const normalizeList = (
  list:
    | (string | Partial<ListItem>)[]
    | readonly (string | Partial<ListItem>)[] = [],
  options: { prefix?: string; suffix?: string } = {},
): ListItem[] => {
  const { prefix = "" } = options
  let { suffix = "" } = options

  if (!Array.isArray(list)) return []

  suffix = suffix ? " " + suffix : ""

  const normalized: ListItem[] = list.map((_) => {
    if (typeof _ == "string" || typeof _ == "number") {
      const label = `${prefix}${toLabel(_)}${suffix}`
      return {
        value: _,
        name: label,
        desc: "",
      }
    } else {
      let { name, value } = _

      if (!name && value) {
        name = `${prefix}${toLabel(value)}${suffix}`
      } else if (typeof value == "undefined" && name) {
        value = slugify(name) || ""
      }
      if (!name) name = ""
      if (!value) value = ""

      return { ..._, name, value }
    }
  })
  return normalized
}
/**
 * Converts a string ToPascalCase
 * @param string - string to manipulate
 *
 * @remarks
 * http://wiki.c2.com/?PascalCase
 */
export const toPascalCase = (text: string): string => {
  return `${text}`
    .replace(new RegExp(/[_-]+/, "g"), " ")
    .replace(new RegExp(/[^\s\w]/, "g"), "")
    .replace(
      new RegExp(/\s+(.)(\w+)/, "g"),
      ($1, $2: string, $3: string) => `${$2.toUpperCase() + $3.toLowerCase()}`,
    )
    .replace(new RegExp(/\s/, "g"), "")
    .replace(new RegExp(/\w/), (s) => s.toUpperCase())
}
/**
 * Validate an email address
 * @reference
 * https://stackoverflow.com/a/46181/1858322
 */
export const validateEmail = (email?: string): string | undefined => {
  if (!email) return undefined
  const re =
    /^(([^\s"(),.:;<>@[\\\]]+(\.[^\s"(),.:;<>@[\\\]]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([\dA-Za-z-]+\.)+[A-Za-z]{2,}))$/
  return re.test(String(email).toLowerCase()) ? email : undefined
}
/**
 * Normalize Domain for display
 */
export const displayDomain = (url?: string): string => {
  if (!url) {
    return ""
  }
  // remove protocol, make www and naked the same, and remove slashes on start or end
  return url
    .replace(/^https?:\/\//, "")
    .replace("www.", "")
    .replace(/\/$/, "")
}

/**
 * Gets a favicon image based on a URL
 * @depends on DuckDuckGo Favicon URL
 */
export const getFavicon = (url: string | string[] | undefined): string => {
  let hostname: string

  if (!url) return ""

  if (Array.isArray(url)) {
    url = url[0]
  }

  if (!url.includes("http")) {
    url = `http://${url}`
  }

  if (!url) {
    hostname = ""
  } else {
    const _url = new URL(url)

    hostname = _url.hostname
  }

  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`
}

export const capitalize = (s?: string): string => {
  if (typeof s !== "string") return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const urlPath = (...parts: string[]): string => {
  const separator = "/"
  parts = parts.map((part, index) => {
    if (index) {
      part = part.replace(new RegExp("^" + separator), "")
    }
    if (index !== parts.length - 1) {
      part = part.replace(new RegExp(separator + "$"), "")
    }
    return part
  })
  return parts.join(separator).replace(/\/+$/, "")
}

export const isJson = <T = unknown>(str?: string): false | undefined | T => {
  if (!str) return undefined
  try {
    const r = JSON.parse(str) as T
    return r
  } catch {
    return false
  }
}

/**
 * In an iFrame?
 * https://stackoverflow.com/a/326076/1858322
 */
export const inIFrame = (): boolean => {
  if (isNode()) return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}
/**
 * group array into elements by key
 */
export const groupBy = <
  T extends Record<string, any[]> = Record<string, any[]>,
>(
  items: any[],
  key: string,
): T => {
  // eslint-disable-next-line unicorn/prefer-object-from-entries, @typescript-eslint/no-unsafe-return
  return items.reduce(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (result, item) => ({
      ...result,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment
      [item[key]]: [...(result[item[key]] || []), item],
    }),
    {},
  )
}
/**
 * replace all instances of a string
 * (default replace only replaces the first instance)
 */
export const replaceAll = (
  str: string,
  match: string,
  replacement: string,
): string => {
  return str.replace(new RegExp(regExpEscape(match), "g"), () => replacement)
}
/**
 * base64 encode and decode a string in both node and browser
 */
export const base64 = (args: {
  action: "encode" | "decode"
  str: string
}): string => {
  const { action, str } = args
  if (typeof window === "undefined") {
    if (action === "encode") {
      return Buffer.from(str).toString("base64")
    } else {
      return Buffer.from(str, "base64").toString("ascii")
    }
  } else {
    if (action === "encode") {
      return window.btoa(str)
    } else {
      return window.atob(str)
    }
  }
}
