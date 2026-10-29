import { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { safeToChecksumAddress } from '../../../../../util/address';
import { toAssetId } from '../../../Bridge/hooks/useAssetMetadata/utils';
import { registerLendingOutputToken } from './registerOutputToken';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
}));

jest.mock('../../../Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(),
}));

jest.mock('@metamask/multichain-network-controller', () => ({
  toEvmCaipChainId: jest.fn(),
}));

const mockAddCustomAsset = Engine.context.AssetsController
  .addCustomAsset as jest.Mock;
const mockSafeToChecksumAddress = safeToChecksumAddress as jest.Mock;
const mockToAssetId = toAssetId as jest.Mock;

const { toEvmCaipChainId } = jest.requireMock(
  '@metamask/multichain-network-controller',
);
const mockToEvmCaipChainId = toEvmCaipChainId as jest.Mock;

const ACCOUNT_ID = 'account-1';
const CONTEXT_SYMBOL = 'USDC';
const CHAIN_ID = '0x1' as Hex;
const CHECKSUMMED_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const CAIP_CHAIN_ID = 'eip155:1';
const CAIP_ASSET_TYPE = `eip155:1/erc20:${CHECKSUMMED_ADDRESS.toLowerCase()}`;

describe('registerLendingOutputToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSafeToChecksumAddress.mockReturnValue(CHECKSUMMED_ADDRESS);
    mockToEvmCaipChainId.mockReturnValue(CAIP_CHAIN_ID);
    mockToAssetId.mockReturnValue(CAIP_ASSET_TYPE);
    mockAddCustomAsset.mockResolvedValue(undefined);
  });

  it('registers the output token with checksummed address and metadata', () => {
    registerLendingOutputToken(
      ACCOUNT_ID,
      {
        chainId: CHAIN_ID,
        token: {
          address: CHECKSUMMED_ADDRESS.toLowerCase(),
          decimals: 6,
          symbol: 'aUSDC',
          name: 'Aave USDC',
        },
      },
      CONTEXT_SYMBOL,
    );

    expect(mockSafeToChecksumAddress).toHaveBeenCalledWith(
      CHECKSUMMED_ADDRESS.toLowerCase(),
    );
    expect(mockAddCustomAsset).toHaveBeenCalledTimes(1);
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      ACCOUNT_ID,
      CAIP_ASSET_TYPE,
      {
        decimals: 6,
        symbol: 'aUSDC',
        address: CHECKSUMMED_ADDRESS,
        name: 'Aave USDC',
        chainId: CHAIN_ID,
      },
    );
  });

  it('falls back to the raw address when it cannot be checksummed', () => {
    const rawAddress = '0xnothex';
    mockSafeToChecksumAddress.mockReturnValue(undefined);

    registerLendingOutputToken(
      ACCOUNT_ID,
      { chainId: CHAIN_ID, token: { address: rawAddress } },
      CONTEXT_SYMBOL,
    );

    expect(mockToAssetId).toHaveBeenCalledWith(rawAddress, CAIP_CHAIN_ID);
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      ACCOUNT_ID,
      CAIP_ASSET_TYPE,
      expect.objectContaining({ address: rawAddress }),
    );
  });

  it('uses default metadata when token fields are missing', () => {
    registerLendingOutputToken(
      ACCOUNT_ID,
      { chainId: CHAIN_ID, token: undefined },
      CONTEXT_SYMBOL,
    );

    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      ACCOUNT_ID,
      CAIP_ASSET_TYPE,
      {
        decimals: 0,
        symbol: '',
        address: CHECKSUMMED_ADDRESS,
        name: '',
        chainId: CHAIN_ID,
      },
    );
  });

  it('does not register when no CAIP asset type can be derived', () => {
    mockToAssetId.mockReturnValue(undefined);

    registerLendingOutputToken(
      ACCOUNT_ID,
      { chainId: CHAIN_ID, token: { address: '0x1234' } },
      CONTEXT_SYMBOL,
    );

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('swallows rejected addCustomAsset promises without throwing', async () => {
    mockAddCustomAsset.mockRejectedValue(new Error('controller failure'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() =>
      registerLendingOutputToken(
        ACCOUNT_ID,
        { chainId: CHAIN_ID, token: { address: '0x1234' } },
        CONTEXT_SYMBOL,
      ),
    ).not.toThrow();

    await Promise.resolve();
    consoleSpy.mockRestore();
  });

  it('catches synchronous errors and logs them without throwing', () => {
    const error = new Error('bad chain id');
    mockToEvmCaipChainId.mockImplementation(() => {
      throw error;
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() =>
      registerLendingOutputToken(
        ACCOUNT_ID,
        { chainId: CHAIN_ID, token: { address: '0x1234' } },
        CONTEXT_SYMBOL,
      ),
    ).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      error,
      `error adding output token for ${CONTEXT_SYMBOL} on confirmation`,
    );
    expect(mockAddCustomAsset).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
