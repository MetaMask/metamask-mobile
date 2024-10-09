import AppConstants from '../../core/AppConstants';

const baseURL = AppConstants.FEATURE_FLAGS_API.BASE_URL;
const version = AppConstants.FEATURE_FLAGS_API.VERSION;

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

  // Map the env value to the expected naming for the API
  let environment = environmentMapping[metamaskEnvironment];

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

  const url = `${baseURL}/${version}/flags?client=${client}&distribution=${metamaskBuildType}&environment=${environment}`;

  return url;
}
