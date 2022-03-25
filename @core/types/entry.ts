import { HeadClient } from "@vueuse/head"
import { App, Component } from "vue"
import { Router } from "vue-router"
import { Store } from "vuex"
import { AppRoute } from "@factor/api/router"
import { ManageUserParams } from "@factor/engine/userAuth"
import { Endpoint, EndpointMeta } from "@factor/engine/endpoint"
import type { ServerModuleDef } from "@factor/render/buildPlugins"
import { FullUser } from "./user"
import { LogHandler, DataProcessor, SiteMapConfig } from "./server"
import { CallbackDictionary } from "./dictionary"
export interface FactorAppEntry {
  app: App
  meta: HeadClient
  router: Router
  store: Store<Record<string, any>>
}

export type EntryModuleExports = {
  runApp: (c: { renderUrl?: string }) => Promise<FactorAppEntry>
  RootComponent: Component
  mainFile: MainFile
}

/**
 * Determine callback by hook
 * https://github.com/microsoft/TypeScript/issues/36444
 */
type HookType<T extends Record<string, any[]>> = {
  [K in keyof T]: {
    hook: K
    callback: (..._arguments: T[K]) => Promise<void>
  }
}[keyof T]

export type MainFile = { setup?: () => Promise<UserConfig> | UserConfig }
export interface UserConfig {
  name?: string
  // need a generic to fix typing error in setupPlugins function
  server?: () =>
    | UserConfig
    | undefined
    | void
    | Promise<UserConfig | undefined | void>
  variables?: Record<
    string,
    | string
    | number
    | Record<string, string>
    | string[]
    | Record<string, string>[]
  >
  cwd?: string
  endpoints?: Endpoint[]
  port?: string
  portApp?: string
  serverOnlyImports?: ServerModuleDef[]
  routes?: AppRoute<string>[]
  sitemaps?: SiteMapConfig[]
  log?: LogHandler
  plugins?: (UserConfig | Promise<UserConfig>)[]
  hooks?: HookType<CallbackDictionary>[]
  userProcessors?: DataProcessor<
    FullUser,
    { meta?: EndpointMeta; params?: ManageUserParams }
  >[]
}
