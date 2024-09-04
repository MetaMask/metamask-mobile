const environmentMapping: { [key: string]: string } = {
  production: 'prod',
  local: 'dev',
};

const buildTypeOptions: string[] = ['main', 'flask', 'qa'];

export default function launchDarklyURL(
  metamaskBuildType = 'main',
  metamaskEnvironment = 'production',
): string {
  const client = 'mobile';

  let environment: string | undefined = environmentMapping[metamaskEnvironment];

  if (!environment) {
    console.warn(
      `Invalid METAMASK_ENVIRONMENT value: ${metamaskEnvironment}. Must be one of ${Object.keys(
        environmentMapping,
      ).join(', ')}. Using default value: production.`,
    );
    metamaskEnvironment = 'production';
    environment = environmentMapping[metamaskEnvironment];
  }

  if (!buildTypeOptions.includes(metamaskBuildType)) {
    console.warn(
      `Invalid METAMASK_BUILD_TYPE value: ${metamaskBuildType}. Must be one of ${buildTypeOptions.join(
        ', ',
      )}. Using default value: main.`,
    );
    metamaskBuildType = 'main';
  }

  const baseURL =
    process.env.LAUNCH_DARKLY_URL ||
    'https://client-config.dev-api.cx.metamask.io' ||
    'http://localhost:3000';
  const url = `${baseURL}/flags?client=${client}&distribution=${metamaskBuildType}&environment=${environment}`;

  return url;
}
