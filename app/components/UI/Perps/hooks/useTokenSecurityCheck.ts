import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectMultipleTokenScanResults } from '../../../../selectors/phishingController';

/**
 * Result type for token security check
 */
export type TokenSecurityResult = 'safe' | 'warning' | 'malicious' | 'unknown';

interface UseTokenSecurityCheckParams {
  /** Token contract address */
  address: string | undefined | null;
  /** Chain ID in hex format (e.g., '0x1') */
  chainId: string | undefined | null;
}

interface UseTokenSecurityCheckResult {
  /** Security result for the token */
  securityResult: TokenSecurityResult;
  /** Whether the token has any security warning (warning or malicious) */
  hasSecurityWarning: boolean;
  /** Whether the token is flagged as malicious */
  isMalicious: boolean;
  /** Whether the token scan result is available (false = unknown/not scanned) */
  isScanned: boolean;
}

/**
 * Hook to check if a token has security warnings from Blockaid/PhishingController
 *
 * Uses the cached token scan results from PhishingController.
 * If the token hasn't been scanned yet, returns 'unknown'.
 *
 * @param params - Token address and chainId
 * @returns Security check result
 *
 * @example
 * ```tsx
 * const { hasSecurityWarning, isMalicious } = useTokenSecurityCheck({
 *   address: token.address,
 *   chainId: '0x1',
 * });
 *
 * if (!hasSecurityWarning) {
 *   // Safe to show Perps banner
 * }
 * ```
 */
export function useTokenSecurityCheck({
  address,
  chainId,
}: UseTokenSecurityCheckParams): UseTokenSecurityCheckResult {
  // Build tokens array for the selector
  const tokens = useMemo(() => {
    if (!address || !chainId) {
      return [];
    }
    return [{ address, chainId }];
  }, [address, chainId]);

  // Get scan results from cache
  const tokenScanResults = useSelector((state: RootState) =>
    selectMultipleTokenScanResults(state, { tokens }),
  );

  // Process the result
  return useMemo(() => {
    // No token provided
    if (!address || !chainId || tokens.length === 0) {
      return {
        securityResult: 'unknown' as const,
        hasSecurityWarning: false,
        isMalicious: false,
        isScanned: false,
      };
    }

    // Get the scan result for our token
    const scanData = tokenScanResults[0]?.scanResult;

    // Token hasn't been scanned yet
    if (!scanData) {
      return {
        securityResult: 'unknown' as const,
        hasSecurityWarning: false,
        isMalicious: false,
        isScanned: false,
      };
    }

    const resultType = scanData.result_type;

    if (resultType === 'Malicious') {
      return {
        securityResult: 'malicious' as const,
        hasSecurityWarning: true,
        isMalicious: true,
        isScanned: true,
      };
    }

    if (resultType === 'Warning') {
      return {
        securityResult: 'warning' as const,
        hasSecurityWarning: true,
        isMalicious: false,
        isScanned: true,
      };
    }

    // Token was scanned and is safe (Benign or other non-warning result)
    return {
      securityResult: 'safe' as const,
      hasSecurityWarning: false,
      isMalicious: false,
      isScanned: true,
    };
  }, [address, chainId, tokens.length, tokenScanResults]);
}
