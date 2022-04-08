import { deepMergeAll } from "@factor/api"
import { serverRenderEntryConfig } from "@factor/engine/nodeUtils"
import { getServerPort } from "@factor/engine/url"
import { initializeDb } from "@factor/engine/db"
import { UserConfig } from "@factor/types"
import type { CliOptions } from "@factor/cli/utils"
import { generateStaticConfig } from "@factor/engine/generate"
import { setUserConfig } from "@factor/engine/plugins"
import { runHooks } from "@factor/engine/hook"
import { setAppGlobals, getFactorConfig } from "./globals"
import { createEndpointServer } from "./create"
import { endpoints } from "./endpoint"
export const setupServerEnv = async (
  entryServerConfig: UserConfig = {},
): Promise<UserConfig> => {
  /**
   * Set initial globals (this will run again after extension)
   */
  await setAppGlobals(entryServerConfig)

  /**
   * Sets config for access throughout app
   */
  const serverConfig = await setUserConfig(entryServerConfig, {
    isServer: true,
  })

  /**
   * Set globals again with any plugin stuff
   */
  await setAppGlobals(serverConfig)

  generateStaticConfig(serverConfig).catch(console.error)

  return serverConfig
}
/**
 * Set up all config variables on server
 */
export const setupEnvironment = async (
  entryServerConfig: UserConfig,
): Promise<UserConfig> => {
  const serverConfig = await setupServerEnv(entryServerConfig)

  await initializeDb()

  await runHooks("afterServerSetup")

  const port = getServerPort()

  await createEndpointServer(port, serverConfig)

  await runHooks("afterServerCreated")

  return serverConfig
}
/**
 * Run the Factor server
 */
export const setup = async (options: CliOptions): Promise<UserConfig> => {
  const { port, moduleName, cwd } = options
  const appConfig = await getFactorConfig({
    config: { endpoints, port },
    moduleName,
    cwd,
  })

  const merge: UserConfig[] = [appConfig]

  /**
   * Require app server entry file if it exists
   */
  const entryServerConfig = await serverRenderEntryConfig({ moduleName, cwd })

  if (entryServerConfig) {
    merge.unshift(entryServerConfig)
  }

  const mergedServerConfig: UserConfig = deepMergeAll(merge)

  return await setupEnvironment(mergedServerConfig)
}
