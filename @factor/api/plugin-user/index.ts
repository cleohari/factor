import jwt from "jsonwebtoken"
// importing this endpoint module is here to fix a bug in DTS generation
// likely fixed in TS 4.8
// https://github.com/microsoft/TypeScript/issues/48212
import "../utils/endpoint"
import type { EndpointMeta } from "../utils"
import { FactorPlugin, FactorPluginSettings } from "../plugin"
import type { HookType } from "../utils/hook"
import { vars, EnvVar } from "../plugin-env"
import type { FactorServer } from "../plugin-server"
import type { FactorDb } from "../plugin-db"
import type { FactorEmail } from "../plugin-email"

import {
  FactorRouter,
  NavigateRoute,
  RouteAuthCallback,
} from "../plugin-router"
import { vueRouter } from "../utils/libraries"
import { QueryUserGoogleAuth } from "./userGoogle"
import {
  ManageUserParams,
  QueryCurrentUser,
  QueryLogin,
  QueryManageUser,
  QueryNewVerificationCode,
  QueryResetPassword,
  QuerySendOneTimeCode,
  QuerySetPassword,
  QueryStartNewUser,
  QueryUpdateCurrentUser,
  QueryVerifyAccountEmail,
} from "./endpoints"
import * as types from "./types"
import { userTable } from "./tables"
export * from "./types"

vars.register(() => [
  new EnvVar({
    name: "GOOGLE_CLIENT_ID",
    val: process.env.GOOGLE_CLIENT_ID,
    isPublic: true,
    isOptional: true,
  }),
  new EnvVar({
    name: "GOOGLE_CLIENT_SECRET",
    val: process.env.GOOGLE_CLIENT_SECRET,
    isOptional: true,
  }),
  new EnvVar({ name: "TOKEN_SECRET", val: process.env.TOKEN_SECRET }),
])

export type FactorUserHookDictionary = {
  onLogout: { args: [] }
  onUserVerified: { args: [types.FullUser] }
  requestCurrentUser: { args: [types.FullUser | undefined] }
  processUser: {
    args: [types.FullUser, { params: ManageUserParams; meta?: EndpointMeta }]
  }
  createUser: {
    args: [types.FullUser, { params: ManageUserParams; meta?: EndpointMeta }]
  }
}

export type UserPluginSettings = {
  factorServer?: FactorServer
  factorDb: FactorDb
  factorEmail?: FactorEmail
  factorRouter?: FactorRouter
  googleClientId?: string
  googleClientSecret?: string
  hooks?: HookType<FactorUserHookDictionary>[]
  tokenSecret?: string
} & FactorPluginSettings

export class FactorUser extends FactorPlugin<UserPluginSettings> {
  factorServer = this.settings.factorServer
  factorDb = this.settings.factorDb
  factorEmail = this.settings.factorEmail
  factorRouter = this.settings.factorRouter
  activeUser = this.utils.vue.ref<types.FullUser>()
  initialized?: Promise<boolean>
  resolveUser?: (value: boolean | PromiseLike<boolean>) => void
  hooks = this.settings.hooks || []
  tokenSecret = this.settings.tokenSecret || "secret"
  activePath = this.utils.vue.ref(this.utils.safeDirname(import.meta.url))
  clientTokenKey = "FCurrentUser"
  googleClientId = this.settings.googleClientId
  googleClientSecret = this.settings.googleClientSecret
  queries = this.createQueries()
  requests = this.createRequests({
    queries: this.queries,
    basePath: "/user",
    factorServer: this.factorServer,
    factorUser: this,
  })

  constructor(settings: UserPluginSettings) {
    super("user", settings)

    this.factorDb.addTables([userTable])

    // redirect based on auth
    // only check if is browser not during prerender
    // anywhere else we don't know logged in status
    if (typeof window !== "undefined") {
      this.factorRouter?.addHook({
        hook: "beforeEach",
        callback: async (params) => {
          const r = await this.verifyRouteAuth({
            route: params.to,
          })

          params.navigate = r

          return params
        },
      })
    }
  }

  init() {
    if (this.utils.isActualBrowser()) {
      this.userInitialized().catch(console.error)
    }
  }

  async verifyRouteAuth(params: {
    route: vueRouter.RouteLocationNormalized
  }): Promise<NavigateRoute> {
    const { route } = params
    const user = await this.userInitialized()

    const { matched } = route

    const results = await Promise.all(
      matched
        .filter((_) => _.meta.auth)
        .map(async (r) => {
          const auth = r.meta.auth as RouteAuthCallback
          return await auth({
            user,
            isSearchBot: this.utils.isSearchBot(),
            factorRouter: this.factorRouter,
            route,
          })
        }),
    )

    const changeNav = results
      .reverse()
      .find(
        (params) =>
          params?.navigate === false || typeof params?.navigate !== undefined,
      )

    if (changeNav) {
      const result = await changeNav?.navigate
      this.log.debug(`route altered by ${changeNav.id}`, { data: changeNav })
      return result
    } else {
      return true
    }
  }

  createQueries() {
    const deps = {
      factorUser: this as FactorUser,
      factorDb: this.factorDb,
      factorEmail: this.factorEmail,
    }

    return {
      UserGoogleAuth: new QueryUserGoogleAuth({
        clientId: this.googleClientId,
        clientSecret: this.googleClientSecret,
        ...deps,
      }),
      Login: new QueryLogin(deps),
      NewVerificationCode: new QueryNewVerificationCode(deps),
      SetPassword: new QuerySetPassword(deps),
      ResetPassword: new QueryResetPassword(deps),
      UpdateCurrentUser: new QueryUpdateCurrentUser(deps),
      SendOneTimeCode: new QuerySendOneTimeCode(deps),
      VerifyAccountEmail: new QueryVerifyAccountEmail(deps),
      StartNewUser: new QueryStartNewUser(deps),
      CurrentUser: new QueryCurrentUser(deps),
      ManageUser: new QueryManageUser(deps),
    } as const
  }

  addHook(hook: HookType<FactorUserHookDictionary>): void {
    this.hooks.push(hook)
  }

  deleteCurrentUser = (): void => {
    this.log.info(`deleted current user`)
    this.clientToken({ action: "destroy" })
    this.activeUser.value = undefined
  }

  cacheUser = ({ user }: { user: Partial<types.FullUser> }): void => {
    if (user && user.userId) this.utils.storeItem(user.userId, user)
  }

  setCurrentUser = (args: {
    user: types.FullUser | undefined
    token?: string
  }): void => {
    const { user, token = "" } = args

    if (!user) return this.deleteCurrentUser()

    this.log.debug(`set current user: ${user.email}`, { data: user, token })

    if (token) {
      this.clientToken({ action: "set", token })
    }
    this.activeUser.value = user

    this.cacheUser({ user })
  }

  logout = async (): Promise<void> => {
    this.deleteCurrentUser()
    this.utils.emitEvent("logout")
    this.utils.emitEvent("resetUi")

    await this.utils.runHooks({
      list: this.hooks,
      hook: "onLogout",
      args: [],
    })
  }

  requestCurrentUser = async (): Promise<types.FullUser | undefined> => {
    const token = this.clientToken({ action: "get" })

    let user: types.FullUser | undefined = undefined

    if (token && this.requests) {
      const { status, data, code } = await this.requests.CurrentUser.request({
        token,
      })

      // If there is a token error, then delete it and force login
      if (status == "error" && code == "TOKEN_ERROR") {
        await this.logout()
      }

      user = data

      if (user) {
        this.setCurrentUser({ user })
      }
    }

    await this.utils.runHooks({
      list: this.hooks,
      hook: "requestCurrentUser",
      args: [user],
    })

    this.log.debug("user loaded", { data: { user } })

    return user
  }

  setUserInitialized = (): void => {
    if (this.resolveUser) this.resolveUser(true)
  }

  userInitialized = async (
    callback?: (u: types.PrivateUser | undefined) => void,
  ): Promise<types.PrivateUser | undefined> => {
    if (!this.initialized) {
      this.initialized = new Promise(async (resolve) => {
        this.resolveUser = resolve
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        await this.requestCurrentUser()
        resolve(true)
      })
    }

    await this.initialized

    if (callback) callback(this.activeUser.value)

    return this.activeUser.value
  }

  pageInitialized = async (): Promise<void> => {
    await Promise.all([
      this.userInitialized(),
      this.factorRouter?.router.isReady(),
    ])

    return
  }

  updateUser = async (
    cb: (
      user: types.FullUser | undefined,
    ) => types.FullUser | undefined | Promise<types.FullUser | undefined>,
  ): Promise<void> => {
    const newUser = await cb(this.activeUser.value)
    if (newUser) {
      this.setCurrentUser({ user: newUser })
    }
  }

  clientToken = (
    args: {
      action?: "set" | "get" | "destroy"
      token?: string
    } = {},
  ): string | undefined => {
    if (typeof window == "undefined") {
      this.log.warn("browser functions not available, set client token")
      return
    }

    const { action = "get", token } = args

    if (action === "destroy") {
      this.utils.removeCookieWithDomain(this.clientTokenKey)
    } else if (action == "set" && token) {
      this.utils.setCookieWithDomain(this.clientTokenKey, token, {
        expires: 14,
        sameSite: "Lax",
      })
    } else {
      const cookieValue = this.utils.getCookie(this.clientTokenKey)

      return cookieValue || ""
    }
  }

  /**
   * Returns a user authentication credential including token for storage in client
   */
  createClientToken = (user: Partial<types.FullUser>): string => {
    const { role = "", userId, email } = user
    return jwt.sign({ role, userId, email }, this.tokenSecret)
  }
  /**
   * Take a JWT token and decode into the associated user _id
   */
  decodeClientToken = (token: string): types.TokenFields => {
    const r = jwt.verify(token, this.tokenSecret) as types.TokenFields

    if (!r.userId || !r.email) {
      throw this.utils._stop({
        message: "token missing userId or email",
        code: "TOKEN_ERROR",
      })
    }

    return r
  }
}
