import '../_mocks_/initialState';
import { isBridgeAllowed, wipeBridgeStatus, getTokenIconUrl } from './index';
import AppConstants from '../../../../core/AppConstants';
import {
  ARBITRUM_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  ETH_CHAIN_ID,
  LINEA_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
} from '@metamask/swaps-controller/dist/constants';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';
import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../core/AppConstants'),
  BRIDGE: {
    ACTIVE: true,
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    BridgeStatusController: {
      wipeBridgeStatus: jest.fn(),
    },
  },
}));

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  formatAddressToAssetId: jest.fn(),
  isNonEvmChainId: jest.fn(),
}));

const mockWipeBridgeStatus = Engine.context.BridgeStatusController
  .wipeBridgeStatus as jest.MockedFunction<
  typeof Engine.context.BridgeStatusController.wipeBridgeStatus
>;

const mockFormatAddressToAssetId =
  formatAddressToAssetId as jest.MockedFunction<typeof formatAddressToAssetId>;
const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;

describe('Bridge Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isBridgeAllowed', () => {
    const supportedChainIds: Hex[] = [
      ETH_CHAIN_ID,
      OPTIMISM_CHAIN_ID,
      BSC_CHAIN_ID,
      POLYGON_CHAIN_ID,
      ZKSYNC_ERA_CHAIN_ID,
      BASE_CHAIN_ID,
      ARBITRUM_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      LINEA_CHAIN_ID,
    ];

    it('return true when bridge is active and chain ID is allowed', () => {
      supportedChainIds.forEach((chainId) => {
        expect(isBridgeAllowed(chainId)).toBe(true);
      });
    });

    it('return false when bridge is active but chain ID is not allowed', () => {
      const unsupportedChainId = '0x1234' as Hex;
      expect(isBridgeAllowed(unsupportedChainId)).toBe(false);
    });

    it('return false when bridge is inactive', () => {
      Object.defineProperty(AppConstants.BRIDGE, 'ACTIVE', {
        get: () => false,
      });

      supportedChainIds.forEach((chainId) => {
        expect(isBridgeAllowed(chainId)).toBe(false);
      });
    });

    it('handle invalid chain ID formats', () => {
      const invalidChainIds = ['0x123' as Hex, '0x' as Hex];

      invalidChainIds.forEach((chainId) => {
        expect(isBridgeAllowed(chainId)).toBe(false);
      });
    });

    it('handle edge cases', () => {
      // Test with malformed chain ID
      expect(
        isBridgeAllowed(
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex,
        ),
      ).toBe(false);
    });
  });

  describe('wipeBridgeStatus', () => {
    const testAddress = '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';
    const testAddressLowercase = testAddress.toLowerCase();
    const evmChainId = ETH_CHAIN_ID;

    it('calls wipeBridgeStatus twice for EVM chains with original and lowercase address', () => {
      mockIsNonEvmChainId.mockReturnValue(false);

      wipeBridgeStatus(testAddress, evmChainId);

      expect(mockWipeBridgeStatus).toHaveBeenCalledTimes(2);
      expect(mockWipeBridgeStatus).toHaveBeenNthCalledWith(1, {
        address: testAddress,
        ignoreNetwork: false,
      });
      expect(mockWipeBridgeStatus).toHaveBeenNthCalledWith(2, {
        address: testAddressLowercase,
        ignoreNetwork: false,
      });
    });

    it('calls wipeBridgeStatus once for Solana chains with original address only', () => {
      mockIsNonEvmChainId.mockReturnValue(true);

      wipeBridgeStatus(testAddress, SolScope.Mainnet);

      expect(mockWipeBridgeStatus).toHaveBeenCalledTimes(1);
      expect(mockWipeBridgeStatus).toHaveBeenCalledWith({
        address: testAddress,
        ignoreNetwork: false,
      });
    });
  });

  describe('getTokenIconUrl', () => {
    beforeEach(() => {
      mockIsNonEvmChainId.mockReturnValue(false);
    });

    it('returns token icon URL for native token on Ethereum', () => {
      const nativeTokenAddress = '0x0000000000000000000000000000000000000000';
      mockFormatAddressToAssetId.mockReturnValue('eip155:1/slip44:60');

      const result = getTokenIconUrl(nativeTokenAddress, ETH_CHAIN_ID);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      );
    });

    it('returns token icon URL for ERC20 token on Ethereum', () => {
      const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      mockFormatAddressToAssetId.mockReturnValue(
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );

      const result = getTokenIconUrl(usdcAddress, ETH_CHAIN_ID);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
      );
    });

    it('returns token icon URL for Solana native token', () => {
      const solNativeAddress = '0x0000000000000000000000000000000000000000';
      mockIsNonEvmChainId.mockReturnValue(true);
      mockFormatAddressToAssetId.mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      );

      const result = getTokenIconUrl(solNativeAddress, SolScope.Mainnet);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      );
    });

    it('returns token icon URL for Solana SPL token', () => {
      const usdcSolanaAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      mockIsNonEvmChainId.mockReturnValue(true);
      mockFormatAddressToAssetId.mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );

      const result = getTokenIconUrl(usdcSolanaAddress, SolScope.Mainnet);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
      );
    });

    it('returns undefined when formatAddressToAssetId returns null', () => {
      const address = '0x1234567890123456789012345678901234567890';
      // @ts-expect-error Testing null return value
      mockFormatAddressToAssetId.mockReturnValue(null);

      const result = getTokenIconUrl(address, ETH_CHAIN_ID);

      expect(result).toBeUndefined();
    });

    it('returns undefined when formatAddressToAssetId returns undefined', () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockFormatAddressToAssetId.mockReturnValue(undefined);

      const result = getTokenIconUrl(address, ETH_CHAIN_ID);

      expect(result).toBeUndefined();
    });

    it('returns undefined when formatAddressToAssetId throws error for unsupported chain', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const unsupportedChainId = '0x9999' as Hex;
      mockFormatAddressToAssetId.mockImplementation(() => {
        throw new Error('Unsupported chain');
      });

      const result = getTokenIconUrl(address, unsupportedChainId);

      expect(result).toBeUndefined();
    });

    it('returns undefined when formatAddressToAssetId throws error for invalid address format', () => {
      const invalidAddress = 'invalid-address-format';
      mockFormatAddressToAssetId.mockImplementation(() => {
        throw new Error('Invalid address format');
      });

      const result = getTokenIconUrl(invalidAddress, ETH_CHAIN_ID);

      expect(result).toBeUndefined();
    });

    it('returns token icon URL for empty address when formatAddressToAssetId succeeds', () => {
      const emptyAddress = '';
      mockFormatAddressToAssetId.mockReturnValue('eip155:1/slip44:60');

      const result = getTokenIconUrl(emptyAddress, ETH_CHAIN_ID);

      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      );
    });
  });
});
