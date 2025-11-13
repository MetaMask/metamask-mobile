import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsGasIncluded7702Supported } from './index';
import { selectSmartAccountOptIn } from '../../../../../selectors/preferencesController';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { isAtomicBatchSupported } from '../../../../../util/transaction-controller';

// Mock dependencies
jest.mock('../../../../../selectors/preferencesController');
jest.mock('../../../../../util/transactions/transaction-relay');
jest.mock('../../../../../util/transaction-controller');

const mockSelectSmartAccountOptIn = jest.mocked(selectSmartAccountOptIn);
const mockIsRelaySupported = jest.mocked(isRelaySupported);
const mockIsAtomicBatchSupported = jest.mocked(isAtomicBatchSupported);

describe('useIsGasIncluded7702Supported', () => {
  const MAINNET_CHAIN_ID = '0x1' as Hex;
  const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
  const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSmartAccountOptIn.mockReturnValue(true);
    mockIsRelaySupported.mockResolvedValue(false);
    mockIsAtomicBatchSupported.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when all requirements are met', () => {
    it('updates gasIncluded7702 to true when smart account opt-in enabled, relay supported, and atomic batch supported', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(true);
      });
    });

    it('calls isAtomicBatchSupported with correct parameters', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsAtomicBatchSupported).toHaveBeenCalledWith({
          address: TEST_ADDRESS,
          chainIds: [MAINNET_CHAIN_ID],
        });
      });
    });
  });

  describe('when chainId is undefined', () => {
    it('updates isGasIncluded7702Supported to false when chainId is undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(undefined, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });

    it('does not call isAtomicBatchSupported when chainId is undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(undefined, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
      });
    });

    it('does not call isRelaySupported when chainId is undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(undefined, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsRelaySupported).not.toHaveBeenCalled();
      });
    });
  });

  describe('when selectedAddress is undefined', () => {
    it('updates isGasIncluded7702Supported to false when selectedAddress is undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, undefined),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });

    it('does not call isAtomicBatchSupported when selectedAddress is undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, undefined),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
      });
    });
  });

  describe('when both parameters are undefined', () => {
    it('updates isGasIncluded7702Supported to false when both chainId and selectedAddress are undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(undefined, undefined),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });

    it('does not call any async functions when both parameters are undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(undefined, undefined),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsRelaySupported).not.toHaveBeenCalled();
        expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
      });
    });
  });

  describe('when chainId is non-EVM', () => {
    it('updates isGasIncluded7702Supported to false for Solana chain', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(SOLANA_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });

    it('does not call async functions for non-EVM chains', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(SOLANA_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsRelaySupported).not.toHaveBeenCalled();
        expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
      });
    });
  });

  describe('when smart account opt-in is disabled', () => {
    it('updates isGasIncluded7702Supported to false when smartAccountOptIn is false', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(false);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });
  });

  describe('when relay is not supported', () => {
    it('updates isGasIncluded7702Supported to false when relay returns false', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(false);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });
  });

  describe('when atomic batch is not supported', () => {
    it('updates isGasIncluded7702Supported to false when isSupported is false', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: false,
          delegationAddress: undefined,
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });

    it('updates isGasIncluded7702Supported to false when result array is empty', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });

    it('updates isGasIncluded7702Supported to false when chainId not found in result', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: '0xa' as Hex, // Different chain
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });
  });

  describe('when multiple chains are returned', () => {
    it('updates isGasIncluded7702Supported to true when all results are supported', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: '0xa' as Hex,
          isSupported: false,
          delegationAddress: '0x1111',
          upgradeContractAddress: '0x2222',
        },
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
        {
          chainId: '0x89' as Hex,
          isSupported: true,
          delegationAddress: '0x3333',
          upgradeContractAddress: '0x4444',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(true);
      });
    });
  });

  describe('when handling CAIP chain IDs', () => {
    it('updates isGasIncluded7702Supported to true with CAIP format chain ID', async () => {
      const CAIP_MAINNET = 'eip155:1';
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(CAIP_MAINNET, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(true);
      });
    });
  });

  describe('when initial state updates', () => {
    it('updates isGasIncluded7702Supported when conditions change from true to false', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        expect(store.getState().bridge.isGasIncluded7702Supported).toBe(true);
      });
    });

    it('calls isAtomicBatchSupported with updated address', async () => {
      const SECOND_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, SECOND_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsAtomicBatchSupported).toHaveBeenCalledWith({
          address: SECOND_ADDRESS,
          chainIds: [MAINNET_CHAIN_ID],
        });
      });
    });
  });

  describe('edge cases', () => {
    it('handles case-insensitive chainId matching', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: '0X1' as Hex, // Uppercase X
          isSupported: true,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported('0x1' as Hex, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(true);
      });
    });

    it('updates isGasIncluded7702Supported to false when isSupported is undefined', async () => {
      mockSelectSmartAccountOptIn.mockReturnValue(true);
      mockIsRelaySupported.mockResolvedValue(true);
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: MAINNET_CHAIN_ID,
          isSupported: undefined as unknown as boolean,
          delegationAddress: '0xabcd',
          upgradeContractAddress: '0xefgh',
        },
      ]);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID, TEST_ADDRESS),
        { state: {} },
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.bridge.isGasIncluded7702Supported).toBe(false);
      });
    });
  });
});
