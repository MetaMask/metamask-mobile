/**
 * Daimo Pay environment types
 * - 'demo': Uses Daimo's demo API for testing (non-production environments)
 * - 'production': Uses Baanx API for real payments (production/rc environments)
 */
export type DaimoEnvironment = 'demo' | 'production';

/**
 * Determines the Daimo Pay environment based on METAMASK_ENVIRONMENT.
 * - Production and RC environments use the production Baanx API
 * - All other environments (dev, test, e2e, exp, etc.) use the Daimo demo API
 *
 * @returns The current Daimo environment
 */
export const getDaimoEnvironment = (): DaimoEnvironment => {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'production':
    case 'rc':
      return 'production';
    default:
      return 'demo';
  }
};

/**
 * Checks if the current environment is production
 *
 * @returns true if in production environment
 */
export const isDaimoProduction = (): boolean =>
  getDaimoEnvironment() === 'production';
