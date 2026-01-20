import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { usePredictWithdrawalTokens } from './usePredictWithdrawalTokens';
import { PREDICT_WITHDRAWAL_SUPPORTED_TOKENS } from '../../constants/predict';
import { AssetType } from '../../types/token';

describe('usePredictWithdrawalTokens', () => {
  describe('filterWithdrawalTokens', () => {
    it('filters tokens to only include supported withdrawal tokens', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      const supportedToken = PREDICT_WITHDRAWAL_SUPPORTED_TOKENS[0];
      const unsupportedToken = {
        address: '0xUnsupportedToken',
        chainId: '0x1' as Hex,
      } as AssetType;

      const tokens = [{ ...supportedToken } as AssetType, unsupportedToken];

      const filtered = result.current.filterWithdrawalTokens(tokens);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].address?.toLowerCase()).toBe(
        supportedToken.address.toLowerCase(),
      );
    });

    it('returns empty array when no tokens match', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      const tokens = [
        { address: '0xUnsupported1', chainId: '0x1' as Hex } as AssetType,
        { address: '0xUnsupported2', chainId: '0x89' as Hex } as AssetType,
      ];

      const filtered = result.current.filterWithdrawalTokens(tokens);

      expect(filtered).toHaveLength(0);
    });

    it('handles case-insensitive address matching', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      const supportedToken = PREDICT_WITHDRAWAL_SUPPORTED_TOKENS[0];
      const tokens = [
        {
          address: supportedToken.address.toLowerCase(),
          chainId: supportedToken.chainId,
        } as AssetType,
      ];

      const filtered = result.current.filterWithdrawalTokens(tokens);

      expect(filtered).toHaveLength(1);
    });
  });

  describe('isSupportedWithdrawalToken', () => {
    it('returns true for supported tokens', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      const supportedToken = PREDICT_WITHDRAWAL_SUPPORTED_TOKENS[0];
      const isSupported = result.current.isSupportedWithdrawalToken(
        supportedToken.address,
        supportedToken.chainId,
      );

      expect(isSupported).toBe(true);
    });

    it('returns false for unsupported tokens', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      const isSupported = result.current.isSupportedWithdrawalToken(
        '0xUnsupportedToken' as Hex,
        '0x1' as Hex,
      );

      expect(isSupported).toBe(false);
    });

    it('returns false when address matches but chainId does not', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      const supportedToken = PREDICT_WITHDRAWAL_SUPPORTED_TOKENS[0];
      const isSupported = result.current.isSupportedWithdrawalToken(
        supportedToken.address,
        '0x999' as Hex, // Wrong chainId
      );

      expect(isSupported).toBe(false);
    });
  });

  describe('supportedTokens', () => {
    it('returns the list of supported withdrawal tokens', () => {
      const { result } = renderHook(() => usePredictWithdrawalTokens());

      expect(result.current.supportedTokens).toBe(
        PREDICT_WITHDRAWAL_SUPPORTED_TOKENS,
      );
      expect(result.current.supportedTokens.length).toBeGreaterThan(0);
    });
  });
});
