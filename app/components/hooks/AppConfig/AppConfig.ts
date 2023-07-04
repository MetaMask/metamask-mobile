// These are the minimum app, android, and iOS versions that we support for security
interface MinimumVersions {
  appMinimumBuild: number;
  appleMinimumOS: number;
  androidMinimumAPIVersion: number;
}

interface Security {
  minimumVersions: MinimumVersions;
}
/*
  More information on this interface can be found here: https://github.com/MetaMask/metamask-mobile/tree/gh-pages
  - this interface should match the this api: https://github.com/MetaMask/metamask-mobile/tree/gh-pages#app-config-api
*/
interface AppConfig {
  security: Security;
}

export default AppConfig;
