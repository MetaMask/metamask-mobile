interface MinimumVersions {
  appMinimumBuild: number;
  appleMinimumOS: number;
  androidMinimumAPIVersion: number;
}

interface Security {
  minimumVersions: MinimumVersions;
}

export default interface AppConfig {
  security: Security;
}
