/**
 * Test constants for Appwright performance tests
 * Centralizes password and other test configuration values
 */

// Test passwords used across different scenarios
export const TEST_PASSWORDS = {
  // Password for login scenarios (existing wallet)
  LOGIN: process.env.E2E_PASSWORD,

  // Password for onboarding scenarios (new wallet creation)
  ONBOARDING: process.env.TEST_ONBOARDING_PASSWORD || '123456789',

  // Password for import scenarios
  IMPORT: process.env.TEST_IMPORT_PASSWORD || '123456789',
};

// Test addresses used in send flows
export const TEST_ADDRESSES = {
  ETHEREUM: '0x8aBB895C61706f33060cDb40e7a2b496C3CA1Dcf',
  SOLANA: '3xTPAZxmpwd8GrNEKApaTw6VH4jqJ31WFXUvQzgwhR7c',
};

// Test amounts for send flows
export const TEST_AMOUNTS = {
  ETHEREUM: '0.0001',
  SOLANA: '0.001',
};

// SRP phrases (these should be set via environment variables)
export const TEST_SRP = {
  SRP_1: process.env.TEST_SRP_1,
  SRP_2: process.env.TEST_SRP_2,
  SRP_3: process.env.TEST_SRP_3,
};

// Helper function to get the appropriate password for a scenario type
export function getPasswordForScenario(scenarioType) {
  switch (scenarioType) {
    case 'login':
      return TEST_PASSWORDS.LOGIN;
    case 'onboarding':
      return TEST_PASSWORDS.ONBOARDING;
    case 'import':
      return TEST_PASSWORDS.ONBOARDING;
    default:
      return TEST_PASSWORDS.LOGIN;
  }
}

// Helper function to validate that required environment variables are set
export function validateTestEnvironment() {
  const missingVars = [];

  if (!TEST_SRP.SRP_1) missingVars.push('TEST_SRP_1');
  if (!TEST_SRP.SRP_2) missingVars.push('TEST_SRP_2');
  if (!TEST_SRP.SRP_3) missingVars.push('TEST_SRP_3');

  if (missingVars.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missingVars.join(', ')}`,
    );
    console.warn(
      'Some test scenarios may not work properly without these variables.',
    );
  }
}
