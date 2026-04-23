import { useEffect, useMemo, useRef, useState } from 'react';
import type { Transaction } from '@metamask/keyring-api';
import { TokenScanResultType } from '@metamask/phishing-controller';
import Engine from '../../../core/Engine';
import {
  buildMultichainActivityTokenScanFingerprint,
  collectMultichainTransactionTokenScanKeys,
  type MultichainTokenScanKey,
} from '../../../util/multichain/multichainTransactionTokenScan';

const BATCH_SIZE = 100;

/**
 * Scans fungible token mints appearing in multichain activity using the same
 * {@link PhishingController.bulkScanTokens} path as {@link MultichainAssetsController}
 * (Malicious-only, fail-open on errors).
 */
export function useMultichainActivityMaliciousTokenKeys(
  transactions: Transaction[],
): {
  maliciousTokenKeys: Set<MultichainTokenScanKey>;
  isScanning: boolean;
} {
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;

  const fingerprint = useMemo(
    () => buildMultichainActivityTokenScanFingerprint(transactions),
    [transactions],
  );

  const [maliciousTokenKeys, setMaliciousTokenKeys] = useState<
    Set<MultichainTokenScanKey>
  >(() => new Set());
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const phishing = Engine.context.PhishingController;

      if (!phishing?.bulkScanTokens) {
        if (!cancelled) {
          setMaliciousTokenKeys(new Set());
          setIsScanning(false);
        }
        return;
      }

      if (fingerprint.length === 0) {
        if (!cancelled) {
          setMaliciousTokenKeys(new Set());
          setIsScanning(false);
        }
        return;
      }

      if (!cancelled) {
        setIsScanning(true);
      }

      try {
        const byNamespace: Record<string, Set<string>> = {};
        for (const tx of transactionsRef.current) {
          for (const key of collectMultichainTransactionTokenScanKeys(tx)) {
            const sep = key.indexOf(':');
            if (sep <= 0) {
              continue;
            }
            const ns = key.slice(0, sep);
            const addr = key.slice(sep + 1);
            if (!addr) {
              continue;
            }
            byNamespace[ns] ??= new Set();
            byNamespace[ns].add(addr);
          }
        }

        const malicious = new Set<MultichainTokenScanKey>();

        for (const [chainNamespace, addresses] of Object.entries(byNamespace)) {
          const list = [...addresses];
          for (let i = 0; i < list.length; i += BATCH_SIZE) {
            const batch = list.slice(i, i + BATCH_SIZE);
            const results = await phishing.bulkScanTokens({
              chainId: chainNamespace,
              tokens: batch,
            });
            if (cancelled) {
              return;
            }
            for (const [address, result] of Object.entries(results ?? {})) {
              if (result?.result_type === TokenScanResultType.Malicious) {
                malicious.add(
                  `${chainNamespace}:${address}` as MultichainTokenScanKey,
                );
              }
            }
          }
        }

        if (!cancelled) {
          setMaliciousTokenKeys(malicious);
        }
      } catch {
        if (!cancelled) {
          setMaliciousTokenKeys(new Set());
        }
      } finally {
        if (!cancelled) {
          setIsScanning(false);
        }
      }
    };

    run().catch((error: unknown) => {
      if (!cancelled) {
        setMaliciousTokenKeys(new Set());
        setIsScanning(false);
      }
      console.warn('Multichain activity token scan failed:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [fingerprint]);

  return { maliciousTokenKeys, isScanning };
}
