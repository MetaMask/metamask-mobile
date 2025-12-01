import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsSendBundleSupported } from './index';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Hex } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../hooks/useAsyncResult');
jest.mock('../../../../../util/transactions/sentinel-api');

const mockUseAsyncResult = useAsyncResult as jest.MockedFunction<
  typeof useAsyncResult
>;

describe('useIsSendBundleSupported', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when chainId is provided', () => {
    it('returns true when sendBundle is supported for Ethereum mainnet', () => {
      mockUseAsyncResult.mockReturnValue({ pending: false, value: true });

      const { result } = renderHookWithProvider(
        () => useIsSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when sendBundle is not supported for the chain', () => {
      mockUseAsyncResult.mockReturnValue({ pending: false, value: false });

      const { result } = renderHookWithProvider(
        () => useIsSendBundleSupported('0x89' as Hex),
        { state: {} },
      );

      expect(result.current).toBe(false);
    });

    it('returns undefined while async operation is pending', () => {
      mockUseAsyncResult.mockReturnValue({ pending: true, value: undefined });

      const { result } = renderHookWithProvider(
        () => useIsSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      expect(result.current).toBe(undefined);
    });
  });

  describe('when chainId is undefined', () => {
    it('returns false when chainId is undefined', () => {
      mockUseAsyncResult.mockReturnValue({ pending: false, value: false });

      const { result } = renderHookWithProvider(
        () => useIsSendBundleSupported(undefined),
        { state: {} },
      );

      expect(result.current).toBe(false);
    });
  });

  describe('when chainId changes', () => {
    it('returns new value when chainId changes', () => {
      // Initially supported
      mockUseAsyncResult.mockReturnValue({ pending: false, value: true });

      const { result, rerender } = renderHookWithProvider(
        () => useIsSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      expect(result.current).toBe(true);

      // Change to unsupported chain
      mockUseAsyncResult.mockReturnValue({ pending: false, value: false });

      rerender(() => useIsSendBundleSupported('0x89' as Hex));

      expect(result.current).toBe(false);
    });

    it('returns undefined while loading after chainId change', () => {
      mockUseAsyncResult.mockReturnValue({ pending: false, value: true });

      const { result, rerender } = renderHookWithProvider(
        () => useIsSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      expect(result.current).toBe(true);

      // Simulate loading state
      mockUseAsyncResult.mockReturnValue({ pending: true, value: undefined });

      rerender(() => useIsSendBundleSupported('0xa' as Hex));

      expect(result.current).toBe(undefined);
    });
  });

  describe('edge cases', () => {
    it('returns null when async result is null', () => {
      mockUseAsyncResult.mockReturnValue({ pending: false, value: null });

      const { result } = renderHookWithProvider(
        () => useIsSendBundleSupported('0x1' as Hex),
        { state: {} },
      );

      expect(result.current).toBe(null);
    });
  });
});
