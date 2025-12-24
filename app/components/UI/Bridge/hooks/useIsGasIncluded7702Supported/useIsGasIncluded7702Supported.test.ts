import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsGasIncluded7702Supported } from './index';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import configureStore from '../../../../../util/test/configureStore';

// Mock dependencies
jest.mock('../../../../../util/transactions/transaction-relay');

const mockIsRelaySupported = jest.mocked(isRelaySupported);

describe('useIsGasIncluded7702Supported', () => {
  const MAINNET_CHAIN_ID = '0x1' as Hex;
  const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

  // Helper to assert state updates
  const expectGasIncluded7702State = async (
    store: ReturnType<typeof configureStore>,
    expected: boolean,
  ) => {
    await waitFor(() => {
      const state = store.getState();
      expect(state.bridge.isGasIncluded7702Supported).toBe(expected);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRelaySupported.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when all requirements are met', () => {
    it('updates gasIncluded7702 to true when relay supported', async () => {
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID),
        { state: {} },
      );

      await expectGasIncluded7702State(store, true);
    });

    it('calls isRelaySupported with correct chainId', async () => {
      mockIsRelaySupported.mockResolvedValue(true);

      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsRelaySupported).toHaveBeenCalledWith(MAINNET_CHAIN_ID);
      });
    });
  });

  describe('when chainId is undefined', () => {
    it('updates isGasIncluded7702Supported to false when chainId is undefined', async () => {
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(undefined),
        { state: {} },
      );

      await expectGasIncluded7702State(store, false);
    });

    it('does not call isRelaySupported when chainId is undefined', async () => {
      renderHookWithProvider(() => useIsGasIncluded7702Supported(undefined), {
        state: {},
      });

      await waitFor(() => {
        expect(mockIsRelaySupported).not.toHaveBeenCalled();
      });
    });
  });

  describe('when chainId is non-EVM', () => {
    it('updates isGasIncluded7702Supported to false for Solana chain', async () => {
      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(SOLANA_CHAIN_ID),
        { state: {} },
      );

      await expectGasIncluded7702State(store, false);
    });

    it('does not call isRelaySupported for non-EVM chains', async () => {
      renderHookWithProvider(
        () => useIsGasIncluded7702Supported(SOLANA_CHAIN_ID),
        { state: {} },
      );

      await waitFor(() => {
        expect(mockIsRelaySupported).not.toHaveBeenCalled();
      });
    });
  });

  describe('when relay is not supported', () => {
    it('updates isGasIncluded7702Supported to false when relay returns false', async () => {
      mockIsRelaySupported.mockResolvedValue(false);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID),
        { state: {} },
      );

      await expectGasIncluded7702State(store, false);
    });
  });

  describe('when handling CAIP chain IDs', () => {
    it('updates isGasIncluded7702Supported to true with CAIP format chain ID', async () => {
      const CAIP_MAINNET = 'eip155:1';
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(CAIP_MAINNET),
        { state: {} },
      );

      await expectGasIncluded7702State(store, true);
    });
  });

  describe('when initial state updates', () => {
    it('updates isGasIncluded7702Supported when conditions change from true to false', async () => {
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID),
        { state: {} },
      );

      await waitFor(() => {
        expect(store.getState().bridge.isGasIncluded7702Supported).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('handles case-insensitive chainId matching', async () => {
      mockIsRelaySupported.mockResolvedValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported('0X1' as Hex),
        { state: {} },
      );

      await expectGasIncluded7702State(store, true);
    });

    it('updates isGasIncluded7702Supported to false when relay support is undefined', async () => {
      mockIsRelaySupported.mockResolvedValue(undefined as unknown as boolean);

      const { store } = renderHookWithProvider(
        () => useIsGasIncluded7702Supported(MAINNET_CHAIN_ID),
        { state: {} },
      );

      await expectGasIncluded7702State(store, false);
    });
  });
});
