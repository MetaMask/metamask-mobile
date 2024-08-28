const environmentMapping: { [key: string]: string } = {
  production: 'prod',
  local: 'dev',
};

const buildTypeOptions: string[] = ['main', 'flask', 'qa'];

export default function launchDarklyURL(): string {
  const client = 'mobile';
  const metamaskEnvironment: string | undefined =
    process.env.METAMASK_ENVIRONMENT;
  const metamaskBuildType: string | undefined = process.env.METAMASK_BUILD_TYPE;

  if (!metamaskEnvironment) {
    throw new Error('METAMASK_ENVIRONMENT is not defined in the .env file.');
  }

  if (!metamaskBuildType) {
    throw new Error('METAMASK_BUILD_TYPE is not defined in the .env file.');
  }

  const distribution: string | undefined =
    environmentMapping[metamaskEnvironment];

  if (!distribution) {
    throw new Error(
      `Invalid METAMASK_ENVIRONMENT value: ${metamaskEnvironment}. Must be one of ${Object.keys(
        environmentMapping,
      ).join(', ')}`,
    );
  }

  if (!buildTypeOptions.includes(metamaskBuildType)) {
    throw new Error(
      `Invalid METAMASK_BUILD_TYPE value: ${metamaskBuildType}. Must be one of ${buildTypeOptions.join(
        ', ',
      )}`,
    );
  }

  const baseURL = 'http://localhost:3000/v1/flags';
  const url = `${baseURL}?client=${client}&environment=${metamaskBuildType}&distribution=${distribution}`;

  return url;
}
