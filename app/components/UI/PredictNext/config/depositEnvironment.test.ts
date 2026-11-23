import {
  BASE_DEPOSIT_NETWORK,
  BASE_SEPOLIA_DEPOSIT_NETWORK,
  resolvePredictDepositEnvironment,
} from './depositEnvironment';

const SIMULATED_ON_BASE_SEPOLIA = {
  network: BASE_SEPOLIA_DEPOSIT_NETWORK,
  transferMode: 'simulated',
};
const WALLET_ON_BASE = {
  network: BASE_DEPOSIT_NETWORK,
  transferMode: 'wallet',
};

describe('resolvePredictDepositEnvironment', () => {
  it('simulates the transfer on Base Sepolia when catalog environment is sandbox', () => {
    expect(resolvePredictDepositEnvironment('sandbox')).toStrictEqual(
      SIMULATED_ON_BASE_SEPOLIA,
    );
  });

  it('sends a real wallet transfer on Base when catalog environment is production', () => {
    expect(resolvePredictDepositEnvironment('production')).toStrictEqual(
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
