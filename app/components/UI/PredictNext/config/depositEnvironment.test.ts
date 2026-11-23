import { ApiEnv } from '../../../../core/apiEnv';
import {
  BASE_DEPOSIT_NETWORK,
  BASE_SEPOLIA_DEPOSIT_NETWORK,
  resolvePredictDepositEnvironment,
  type DepositEnvironmentReading,
} from './depositEnvironment';

const reading = (
  overrides: Partial<DepositEnvironmentReading>,
): DepositEnvironmentReading => ({
  rawApiEnv: undefined,
  apiEnv: ApiEnv.Prod,
  isDevelopment: false,
  metamaskEnvironment: undefined,
  ...overrides,
});

const SIMULATED_ON_BASE_SEPOLIA = {
  network: BASE_SEPOLIA_DEPOSIT_NETWORK,
  transferMode: 'simulated',
};
const WALLET_ON_BASE = {
  network: BASE_DEPOSIT_NETWORK,
  transferMode: 'wallet',
};

describe('resolvePredictDepositEnvironment', () => {
  it('simulates the transfer on Base Sepolia for a build on the dev Predict API', () => {
    expect(
      resolvePredictDepositEnvironment(
        reading({
          rawApiEnv: 'dev',
          apiEnv: ApiEnv.Dev,
          metamaskEnvironment: 'dev',
        }),
      ),
    ).toStrictEqual(SIMULATED_ON_BASE_SEPOLIA);
  });

  it('simulates the transfer for a local development build with no cluster', () => {
    expect(
      resolvePredictDepositEnvironment(reading({ isDevelopment: true })),
    ).toStrictEqual(SIMULATED_ON_BASE_SEPOLIA);
  });

  it.each(['production', 'beta', 'rc', 'Production '])(
    'never simulates in a %s build, even pointed at the dev Predict API',
    (metamaskEnvironment) => {
      expect(
        resolvePredictDepositEnvironment(
          reading({
            rawApiEnv: 'dev',
            apiEnv: ApiEnv.Dev,
            isDevelopment: true,
            metamaskEnvironment,
          }),
        ),
      ).toStrictEqual(WALLET_ON_BASE);
    },
  );

  it.each([
    ['prod', ApiEnv.Prod],
    ['uat', ApiEnv.Uat],
  ])(
    'sends a real transfer on Base for the %s cluster',
    (rawApiEnv, apiEnv) => {
      expect(
        resolvePredictDepositEnvironment(
          reading({ rawApiEnv, apiEnv, isDevelopment: true }),
        ),
      ).toStrictEqual(WALLET_ON_BASE);
    },
  );

  it('sends a real transfer on Base for a release build with no cluster', () => {
    expect(resolvePredictDepositEnvironment(reading({}))).toStrictEqual(
      WALLET_ON_BASE,
    );
  });

  it('names the known USDC contract for each chain', () => {
    expect(BASE_DEPOSIT_NETWORK).toStrictEqual({
      chainId: 8453,
      networkName: 'Base',
      usdc: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        decimals: 6,
      },
    });
    expect(BASE_SEPOLIA_DEPOSIT_NETWORK).toStrictEqual({
      chainId: 84532,
      networkName: 'Base Sepolia',
      usdc: {
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        symbol: 'USDC',
        decimals: 6,
      },
    });
  });
});
