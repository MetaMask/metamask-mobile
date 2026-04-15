import { toCardFundingToken } from './toCardTokenAllowance';
import { FundingStatus } from '../types';
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
    spendableBalance: '100',
    spendingCap: '100',
    priority: 1,
    status: FundingAssetStatus.Active,
    ...overrides,
  };
}

describe('toCardFundingToken', () => {
  describe('status → fundingStatus mapping', () => {
    it("maps 'active' → FundingStatus.Enabled", () => {
      const result = toCardFundingToken(
        makeAsset({ status: FundingAssetStatus.Active }),
      );
      expect(result.fundingStatus).toBe(FundingStatus.Enabled);
    });

    it("maps 'limited' → FundingStatus.Limited", () => {
      const result = toCardFundingToken(
        makeAsset({ status: FundingAssetStatus.Limited }),
      );
      expect(result.fundingStatus).toBe(FundingStatus.Limited);
    });

    it("maps 'inactive' → FundingStatus.NotEnabled", () => {
      const result = toCardFundingToken(
        makeAsset({ status: FundingAssetStatus.Inactive }),
      );
      expect(result.fundingStatus).toBe(FundingStatus.NotEnabled);
    });

    it('falls back to FundingStatus.NotEnabled for unknown status', () => {
      const result = toCardFundingToken(
        makeAsset({ status: 'unknown_status' as FundingAssetStatus }),
      );
      expect(result.fundingStatus).toBe(FundingStatus.NotEnabled);
    });
  });

  describe('priority mapping', () => {
    it('maps priority below Number.MAX_SAFE_INTEGER as-is', () => {
      const result = toCardFundingToken(makeAsset({ priority: 3 }));
      expect(result.priority).toBe(3);
    });

    it('maps priority >= Number.MAX_SAFE_INTEGER to undefined', () => {
      const result = toCardFundingToken(
        makeAsset({ priority: Number.MAX_SAFE_INTEGER }),
      );
      expect(result.priority).toBeUndefined();
    });
  });

  describe('spendableBalance mapping', () => {
    it("preserves spendableBalance when provider spendableBalance is '0'", () => {
      const result = toCardFundingToken(makeAsset({ spendableBalance: '0' }));
      expect(result.spendableBalance).toBe('0');
    });

    it('sets spendableBalance when spendableBalance is a non-zero string', () => {
      const result = toCardFundingToken(makeAsset({ spendableBalance: '100' }));
      expect(result.spendableBalance).toBe('100');
    });

    it('passes through empty string for spendableBalance', () => {
      const result = toCardFundingToken(makeAsset({ spendableBalance: '' }));
      expect(result.spendableBalance).toBe('');
    });
  });

  describe('stagingTokenAddress mapping', () => {
    it('passes through stagingTokenAddress when present', () => {
      const result = toCardFundingToken(
        makeAsset({ stagingTokenAddress: '0xstaging' }),
      );
      expect(result.stagingTokenAddress).toBe('0xstaging');
    });

    it('sets stagingTokenAddress to null when absent', () => {
      const result = toCardFundingToken(makeAsset());
      expect(result.stagingTokenAddress).toBeNull();
    });
  });

  describe('field passthrough', () => {
    it('maps remaining balance to spendableBalance and total cap to spendingCap', () => {
      const asset = makeAsset({
        address: '0xaddr',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
        chainId: 'eip155:1' as `eip155:${number}`,
        spendableBalance: '123',
        spendingCap: '999',
        walletAddress: '0xowner',
      });
      const result = toCardFundingToken(asset);
      expect(result.address).toBe('0xaddr');
      expect(result.decimals).toBe(18);
      expect(result.symbol).toBe('ETH');
      expect(result.name).toBe('Ether');
      expect(result.caipChainId).toBe('eip155:1');
      expect(result.spendableBalance).toBe('123');
      expect(result.spendingCap).toBe('999');
      expect(result.walletAddress).toBe('0xowner');
    });
  });
});
