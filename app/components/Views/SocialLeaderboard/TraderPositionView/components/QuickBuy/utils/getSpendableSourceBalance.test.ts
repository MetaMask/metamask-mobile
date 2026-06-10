import type { BridgeToken } from '../../../../../../UI/Bridge/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { GasFeeEstimatesType } from '../../../../../confirmations/utils/estimated-total-gas';
import { getSpendableSourceBalance } from './getSpendableSourceBalance';

const NATIVE_ETH: Pick<BridgeToken, 'address' | 'chainId' | 'decimals'> = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  decimals: 18,
};

const USDC: Pick<BridgeToken, 'address' | 'chainId' | 'decimals'> = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  decimals: 6,
};

const SOL_NATIVE: Pick<BridgeToken, 'address' | 'chainId' | 'decimals'> = {
  address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  decimals: 9,
};

// 10 gwei medium maxFeePerGas x 21000 native-transfer gas = 0.00021 ETH.
const gasFeeEstimates: GasFeeEstimatesType = {
  medium: { suggestedMaxFeePerGas: 10 },
};

describe('getSpendableSourceBalance', () => {
  it('subtracts the estimated gas buffer for an EVM-native pay token', () => {
    // Arrange
    const params = {
      displayBalance: '1',
      token: NATIVE_ETH,
      gasFeeEstimates,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBeCloseTo(0.99979, 10);
  });

  it('returns the full balance for an ERC-20 pay token', () => {
    // Arrange
    const params = {
      displayBalance: '100',
      token: USDC,
      gasFeeEstimates,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(100);
  });

  it('clamps at zero when the native balance is smaller than the gas buffer', () => {
    // Arrange: 0.0001 ETH < 0.00021 ETH buffer.
    const params = {
      displayBalance: '0.0001',
      token: NATIVE_ETH,
      gasFeeEstimates,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(0);
  });

  it('returns the full native balance when gas estimates are unavailable', () => {
    // Arrange
    const params = {
      displayBalance: '1',
      token: NATIVE_ETH,
      gasFeeEstimates: undefined,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(1);
  });

  it('returns the full native balance when the network sponsors gas', () => {
    // Arrange
    const params = {
      displayBalance: '1',
      token: NATIVE_ETH,
      gasFeeEstimates,
      isGasSponsored: true,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(1);
  });

  it('returns the full balance for a non-EVM native token (no EVM gas estimates apply)', () => {
    // Arrange
    const params = {
      displayBalance: '2.5',
      token: SOL_NATIVE,
      gasFeeEstimates,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(2.5);
  });

  it('returns the full balance when no token is selected yet', () => {
    // Arrange
    const params = {
      displayBalance: '3',
      token: undefined,
      gasFeeEstimates,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(3);
  });

  it.each([
    ['undefined balance', undefined],
    ['empty balance', ''],
    ['non-numeric balance', 'abc'],
    ['zero balance', '0'],
    ['negative balance', '-1'],
  ])('returns zero for %s', (_label, displayBalance) => {
    // Arrange
    const params = {
      displayBalance,
      token: NATIVE_ETH,
      gasFeeEstimates,
    };

    // Act
    const spendable = getSpendableSourceBalance(params);

    // Assert
    expect(spendable).toBe(0);
  });
});
