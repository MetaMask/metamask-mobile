import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsGasIncludedSTXSendBundleSupported } from './index';
import { useIsSendBundleSupported } from '../useIsSendBundleSupported';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { Hex } from '@metamask/utils';
import { act } from '@testing-library/react-native';

// Mock dependencies
jest.mock('../useIsSendBundleSupported');
jest.mock('../../../../../selectors/smartTransactionsController');

const mockUseIsSendBundleSupported =
  useIsSendBundleSupported as jest.MockedFunction<
    typeof useIsSendBundleSupported
  >;
const mockSelectShouldUseSmartTransaction =
  selectShouldUseSmartTransaction as jest.MockedFunction<
    typeof selectShouldUseSmartTransaction
  >;

describe('useIsGasIncludedSTXSendBundleSupported', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when both smart transactions and sendBundle are supported', () => {
    it('updates state with isGasIncludedSTXSendBundleSupported true for Ethereum mainnet', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockUseIsSendBundleSupported.mockReturnValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(true);
    });

    it('updates state with gasIncluded true for Optimism chain', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockUseIsSendBundleSupported.mockReturnValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0xa' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(true);
    });
  });

  describe('when smart transactions are not supported', () => {
    it('updates state with isGasIncludedSTXSendBundleSupported false when smart transactions disabled', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockUseIsSendBundleSupported.mockReturnValue(true);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });
  });

  describe('when sendBundle is not supported', () => {
    it('updates state with isGasIncludedSTXSendBundleSupported false when sendBundle not supported', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockUseIsSendBundleSupported.mockReturnValue(false);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });

    it('updates state with gasIncluded false when sendBundle returns undefined', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockUseIsSendBundleSupported.mockReturnValue(undefined);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });

    it('updates state with isGasIncludedSTXSendBundleSupported false when sendBundle returns null', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockUseIsSendBundleSupported.mockReturnValue(null as unknown as boolean);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });
  });

  describe('when both smart transactions and sendBundle are not supported', () => {
    it('updates state with isGasIncludedSTXSendBundleSupported false', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockUseIsSendBundleSupported.mockReturnValue(false);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });
  });

  describe('when chainId is undefined', () => {
    it('updates state with isGasIncludedSTXSendBundleSupported false when chainId is undefined', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockUseIsSendBundleSupported.mockReturnValue(false);

      const { store } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported(undefined),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });
  });

  describe('when chainId is non-EVM', () => {
    it('updates state with isGasIncludedSTXSendBundleSupported false for Solana mainnet', () => {
      // When evmChainId is undefined, mocks should return false
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockUseIsSendBundleSupported.mockReturnValue(false);

      const { store } = renderHookWithProvider(
        () =>
          useIsGasIncludedSTXSendBundleSupported(
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          ),
        { state: {} },
      );

      const state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });

    it('calls useIsSendBundleSupported with undefined for non-EVM chains', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockUseIsSendBundleSupported.mockReturnValue(false);

      renderHookWithProvider(
        () =>
          useIsGasIncludedSTXSendBundleSupported(
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          ),
        { state: {} },
      );

      expect(mockUseIsSendBundleSupported).toHaveBeenCalledWith(undefined);
    });
  });

  describe('when chainId changes', () => {
    it('updates state when chainId changes', () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockUseIsSendBundleSupported.mockReturnValue(true);

      const { store, rerender } = renderHookWithProvider(
        () => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      // Initial state
      let state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(true);

      // Change conditions - smart transactions not supported on new chain
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockUseIsSendBundleSupported.mockReturnValue(false);

      act(() => {
        rerender(() => useIsGasIncludedSTXSendBundleSupported('0x1' as Hex));
      });

      // State should be updated to false
      state = store.getState();
      expect(state.bridge.isGasIncludedSTXSendBundleSupported).toBe(false);
    });
  });
});
