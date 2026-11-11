import type { AssetsControllerState } from '@metamask/assets-controller';
import type {
  TransactionPayQuote,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import type { Hex, Json } from '@metamask/utils';
import {
  getEvmAsset,
  getEvmPaymentToken,
  getEvmPaymentTokenAssetId,
  getNonEvmPaymentToken,
  isEvmTransactionPayQuote,
  isNonEvmPaymentToken,
} from './payment-token';

const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOL_ASSET_ID = `${SOLANA_CHAIN_ID}/slip44:501` as const;
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_ASSET_ID = `eip155:1/erc20:${USDC_ADDRESS}` as const;

const PAYMENT_TOKEN_MOCK: TransactionPaymentToken = {
  assetId: USDC_ASSET_ID,
  balanceFiat: '1',
  balanceHuman: '1',
  balanceRaw: '1000000',
  balanceUsd: '1',
  decimals: 6,
  symbol: 'USDC',
};

const SOL_PAYMENT_TOKEN_MOCK: TransactionPaymentToken = {
  ...PAYMENT_TOKEN_MOCK,
  assetId: SOL_ASSET_ID,
  decimals: 9,
  symbol: 'SOL',
};

function buildAssetsInfo(
  entries: Record<string, 'native' | 'erc20'>,
): AssetsControllerState['assetsInfo'] {
  return Object.fromEntries(
    Object.entries(entries).map(([assetId, type]) => [
      assetId,
      { type, symbol: '', name: '', decimals: 18 },
    ]),
  ) as AssetsControllerState['assetsInfo'];
}

describe('payment-token', () => {
  describe('getEvmAsset', () => {
    it('derives the Hex chain ID and address of an ERC-20 asset', () => {
      expect(getEvmAsset(USDC_ASSET_ID)).toStrictEqual({
        address: USDC_ADDRESS,
        chainId: '0x1',
      });
    });

    it('maps a slip44 native asset to the chain native token address', () => {
      expect(getEvmAsset('eip155:1/slip44:60')).toStrictEqual({
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
      });
      expect(getEvmAsset('eip155:137/slip44:966')).toStrictEqual({
        address: '0x0000000000000000000000000000000000001010',
        chainId: '0x89',
      });
    });

    it('returns undefined for a non-EVM asset', () => {
      expect(getEvmAsset(SOL_ASSET_ID)).toBeUndefined();
    });
  });

  describe('isNonEvmPaymentToken', () => {
    it('derives the protocol from the asset ID', () => {
      expect(isNonEvmPaymentToken(SOL_PAYMENT_TOKEN_MOCK)).toBe(true);
      expect(isNonEvmPaymentToken(PAYMENT_TOKEN_MOCK)).toBe(false);
    });
  });

  describe('getEvmPaymentToken', () => {
    it('adds the derived chain ID and address to an EVM token', () => {
      expect(getEvmPaymentToken(PAYMENT_TOKEN_MOCK)).toStrictEqual({
        ...PAYMENT_TOKEN_MOCK,
        address: USDC_ADDRESS,
        chainId: '0x1',
      });
    });

    it('returns undefined for a non-EVM or missing token', () => {
      expect(getEvmPaymentToken(SOL_PAYMENT_TOKEN_MOCK)).toBeUndefined();
      expect(getEvmPaymentToken(undefined)).toBeUndefined();
    });
  });

  describe('getNonEvmPaymentToken', () => {
    it('adds the CAIP-2 chain ID to a non-EVM token', () => {
      expect(getNonEvmPaymentToken(SOL_PAYMENT_TOKEN_MOCK)).toStrictEqual({
        ...SOL_PAYMENT_TOKEN_MOCK,
        chainId: SOLANA_CHAIN_ID,
      });
    });

    it('returns undefined for an EVM or missing token', () => {
      expect(getNonEvmPaymentToken(PAYMENT_TOKEN_MOCK)).toBeUndefined();
      expect(getNonEvmPaymentToken(undefined)).toBeUndefined();
    });
  });

  describe('getEvmPaymentTokenAssetId', () => {
    it('returns the checksummed AssetsController key of an ERC-20 token', () => {
      const assetsInfo = buildAssetsInfo({
        [USDC_ASSET_ID.toLowerCase()]: 'erc20',
        [USDC_ASSET_ID]: 'erc20',
      });

      expect(
        getEvmPaymentTokenAssetId(
          { address: USDC_ADDRESS.toLowerCase() as Hex, chainId: '0x1' },
          assetsInfo,
        ),
      ).toBe(USDC_ASSET_ID);
    });

    it('returns a lowercase key when it is the only match', () => {
      const lowercaseAssetId = USDC_ASSET_ID.toLowerCase();

      expect(
        getEvmPaymentTokenAssetId(
          { address: USDC_ADDRESS, chainId: '0x1' },
          buildAssetsInfo({ [lowercaseAssetId]: 'erc20' }),
        ),
      ).toBe(lowercaseAssetId);
    });

    it('returns the native asset key of the chain for the native token address', () => {
      const assetsInfo = buildAssetsInfo({
        'eip155:1/slip44:60': 'native',
        'eip155:137/slip44:966': 'native',
      });

      expect(
        getEvmPaymentTokenAssetId(
          {
            address: '0x0000000000000000000000000000000000001010',
            chainId: '0x89',
          },
          assetsInfo,
        ),
      ).toBe('eip155:137/slip44:966');
    });

    it('falls back to the derived asset ID when the token is not in state', () => {
      expect(
        getEvmPaymentTokenAssetId(
          { address: USDC_ADDRESS, chainId: '0xa' },
          buildAssetsInfo({}),
        ),
      ).toBe(`eip155:10/erc20:${USDC_ADDRESS}`);
    });
  });

  describe('quote source protocol', () => {
    const EVM_QUOTE_MOCK = {
      request: {
        sourceAccountId: 'eip155:1:0x123',
        sourceAssetId: USDC_ASSET_ID,
      },
    } as unknown as TransactionPayQuote<Json>;

    const NON_EVM_QUOTE_MOCK = {
      request: {
        sourceAccountId: `${SOLANA_CHAIN_ID}:SoLAddress`,
        sourceAssetId: SOL_ASSET_ID,
      },
    } as unknown as TransactionPayQuote<Json>;

    it('identifies EVM quotes from the source asset ID', () => {
      expect(isEvmTransactionPayQuote(EVM_QUOTE_MOCK)).toBe(true);
      expect(isEvmTransactionPayQuote(NON_EVM_QUOTE_MOCK)).toBe(false);
    });
  });
});
