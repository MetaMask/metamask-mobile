import { toCardTokenAllowance } from './toCardTokenAllowance';
import { AllowanceState } from '../types';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

function makeAsset(
  overrides: Partial<CardFundingAsset> = {},
): CardFundingAsset {
  return {
    address: '0xtoken',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    walletAddress: '0xwallet',
    chainId: 'eip155:59144' as `eip155:${number}`,
    balance: '100',
    allowance: '100',
    priority: 1,
    status: FundingAssetStatus.Active,
    ...overrides,
  };
}

describe('toCardTokenAllowance', () => {
  describe('status → allowanceState mapping', () => {
    it("maps 'active' → AllowanceState.Enabled", () => {
      const result = toCardTokenAllowance(
        makeAsset({ status: FundingAssetStatus.Active }),
      );
      expect(result.allowanceState).toBe(AllowanceState.Enabled);
    });

    it("maps 'limited' → AllowanceState.Limited", () => {
      const result = toCardTokenAllowance(
        makeAsset({ status: FundingAssetStatus.Limited }),
      );
      expect(result.allowanceState).toBe(AllowanceState.Limited);
    });

    it("maps 'inactive' → AllowanceState.NotEnabled", () => {
      const result = toCardTokenAllowance(
        makeAsset({ status: FundingAssetStatus.Inactive }),
      );
      expect(result.allowanceState).toBe(AllowanceState.NotEnabled);
    });

    it('falls back to AllowanceState.NotEnabled for unknown status', () => {
      const result = toCardTokenAllowance(
        makeAsset({ status: 'unknown_status' as FundingAssetStatus }),
      );
      expect(result.allowanceState).toBe(AllowanceState.NotEnabled);
    });
  });

  describe('priority mapping', () => {
    it('maps priority below Number.MAX_SAFE_INTEGER as-is', () => {
      const result = toCardTokenAllowance(makeAsset({ priority: 3 }));
      expect(result.priority).toBe(3);
    });

    it('maps priority >= Number.MAX_SAFE_INTEGER to undefined', () => {
      const result = toCardTokenAllowance(
        makeAsset({ priority: Number.MAX_SAFE_INTEGER }),
      );
      expect(result.priority).toBeUndefined();
    });
  });

  describe('availableBalance mapping', () => {
    it("sets availableBalance to undefined when balance is '0'", () => {
      const result = toCardTokenAllowance(makeAsset({ balance: '0' }));
      expect(result.availableBalance).toBeUndefined();
    });

    it('sets availableBalance when balance is a non-zero string', () => {
      const result = toCardTokenAllowance(makeAsset({ balance: '100' }));
      expect(result.availableBalance).toBe('100');
    });

    it('sets availableBalance to undefined when balance is empty string', () => {
      const result = toCardTokenAllowance(makeAsset({ balance: '' }));
      expect(result.availableBalance).toBeUndefined();
    });
  });

  describe('stagingTokenAddress mapping', () => {
    it('passes through stagingTokenAddress when present', () => {
      const result = toCardTokenAllowance(
        makeAsset({ stagingTokenAddress: '0xstaging' }),
      );
      expect(result.stagingTokenAddress).toBe('0xstaging');
    });

    it('sets stagingTokenAddress to null when absent', () => {
      const result = toCardTokenAllowance(makeAsset());
      expect(result.stagingTokenAddress).toBeNull();
    });
  });

  describe('field passthrough', () => {
    it('maps all required fields from CardFundingAsset', () => {
      const asset = makeAsset({
        address: '0xaddr',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
        chainId: 'eip155:1' as `eip155:${number}`,
        allowance: '999',
        walletAddress: '0xowner',
      });
      const result = toCardTokenAllowance(asset);
      expect(result.address).toBe('0xaddr');
      expect(result.decimals).toBe(18);
      expect(result.symbol).toBe('ETH');
      expect(result.name).toBe('Ether');
      expect(result.caipChainId).toBe('eip155:1');
      expect(result.allowance).toBe('999');
      expect(result.walletAddress).toBe('0xowner');
    });
  });
});
