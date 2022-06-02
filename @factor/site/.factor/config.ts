/* tslint:disable */
/**
 * Automatically generated file, do not modify by hand.
 */

export interface CompiledServiceConfig {
  commands: "build" | "bundle" | "deploy" | "dev" | "generate" | "prerender" | "rdev" | "release" | "server" | "start";
  vars:
    | "appPort"
    | "awsAccessKey"
    | "awsAccessKeySecret"
    | "googleClientSecret"
    | "mode"
    | "postgresUrl"
    | "serverPort"
    | "serverUrl"
    | "smtpHost"
    | "smtpPassword"
    | "smtpUser"
    | "stripeSecretKeyTest"
    | "tokenSecret";
  endpoints:
    | "AllProducts"
    | "CurrentUser"
    | "GetCoupon"
    | "GetCustomerData"
    | "GetInvoices"
    | "GetProduct"
    | "ListSubscriptions"
    | "Login"
    | "ManageCustomer"
    | "ManagePaymentMethod"
    | "ManageSubscription"
    | "ManageUser"
    | "MediaAction"
    | "MediaIndex"
    | "NewVerificationCode"
    | "ResetPassword"
    | "SaveMedia"
    | "SendOneTimeCode"
    | "SetPassword"
    | "StartNewUser"
    | "Unsplash"
    | "UpdateCurrentUser"
    | "UserGoogleAuth"
    | "VerifyAccountEmail"
    | "stripeWebhooks";
  routes:
    | "blog"
    | "blogIndex"
    | "blogSingle"
    | "docs"
    | "docsIndex"
    | "docsSingle"
    | "home"
    | "install"
    | "plugins"
    | "showcase"
    | "showcaseSingle"
    | "testInputs"
    | "testing";
  ui: "";
  menus: "";
  [k: string]: unknown;
}
