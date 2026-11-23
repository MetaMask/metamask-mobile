import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { RelayFixedSpreadConfig } from '../../../Views/confirmations/utils/relayFixedSpread';
import { isMoneyDepositFeeSubsidized } from './isMoneyDepositFeeSubsidized';

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const depositToken = {
  address: USDC_ADDRESS,
  chainId: '0x1',
};
const configWithMoneyDepositRoute: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: '0x1',
      sourceToken: USDC_ADDRESS as `0x${string}`,
      targetChain: CHAIN_IDS.MONAD,
      targetToken: MUSD_TOKEN_ADDRESS as `0x${string}`,
    },
  ],
};

describe('isMoneyDepositFeeSubsidized', () => {
  it('returns true for a subsidized route targeting Monad mUSD', () => {
    const result = isMoneyDepositFeeSubsidized(
      configWithMoneyDepositRoute,
      depositToken,
    );

    expect(result).toBe(true);
  });

  it('returns true for Monad mUSD without a configured self-route', () => {
    const result = isMoneyDepositFeeSubsidized(
      { routes: [] },
      {
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MONAD,
      },
    );

    expect(result).toBe(true);
  });

  it('returns false when route targets another asset', () => {
    const result = isMoneyDepositFeeSubsidized(
      {
        routes: [
          {
            sourceChain: '0x1',
            sourceToken: USDC_ADDRESS as `0x${string}`,
            targetChain: '0x1',
            targetToken: '0x1111111111111111111111111111111111111111',
          },
        ],
      },
      depositToken,
    );

    expect(result).toBe(false);
  });

  it('returns false for a token without a chain ID', () => {
    const result = isMoneyDepositFeeSubsidized(configWithMoneyDepositRoute, {
      address: USDC_ADDRESS,
      chainId: undefined,
    });

    expect(result).toBe(false);
  });
});
