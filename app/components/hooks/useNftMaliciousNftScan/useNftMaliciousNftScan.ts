import { useEffect, useMemo, useRef } from 'react';
import type { Nft } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { TokenScanResultType } from '@metamask/phishing-controller';
import Engine from '../../../core/Engine';

const BATCH_SIZE = 100;
/** PhishingController only caches token scans for 1 minute, so keep verdicts longer here. */
const VERDICT_TTL_MS = 60 * 60 * 1000;

interface Verdict {
  isMalicious: boolean;
  scannedAt: number;
}

/** Session-level verdict cache shared by every consumer, keyed by `chainId:contract`. */
const verdictCache = new Map<string, Verdict>();
/** Contracts with a scan in flight, so overlapping runs (a growing list) don't request them twice. */
const pendingScans = new Set<string>();

export const clearNftMaliciousScanCache = (): void => {
  verdictCache.clear();
  pendingScans.clear();
};

const getCachedVerdict = (key: string): Verdict | undefined => {
  const verdict = verdictCache.get(key);
  if (verdict && Date.now() - verdict.scannedAt > VERDICT_TTL_MS) {
    verdictCache.delete(key);
    return undefined;
  }
  return verdict;
};

/** Contract scan key, e.g. `0x1:0xabc...`. `undefined` when the NFT has no chain or address. */
const getScanKey = (nft: Nft): string | undefined =>
  nft.chainId === undefined || !nft.address
    ? undefined
    : `${toHex(nft.chainId)}:${nft.address.toLowerCase()}`;

/**
 * Removes the NFT from NftController state without adding it to `ignoredNfts`,
 * so there is no permanent record. Detection may add it again if the NFT API
 * still returns it; the cached verdict then removes it again (removing twice
 * is a harmless no-op).
 */
const removeMaliciousNfts = (nfts: Nft[]) => {
  const { NftController, NetworkController } = Engine.context;
  for (const nft of nfts) {
    const scanKey = getScanKey(nft);
    if (!scanKey || !getCachedVerdict(scanKey)?.isMalicious) continue;
    try {
      NftController.removeNft(
        nft.address,
        nft.tokenId,
        NetworkController.findNetworkClientIdByChainId(
          toHex(nft.chainId as number),
        ),
      );
    } catch (error) {
      // Fail-open: the NFT stays visible and removal is retried on a later run.
      console.warn('Failed to remove malicious NFT:', error);
    }
  }
};

/**
 * Scans the contracts of the given (rendered) NFTs with
 * PhishingController.bulkScanTokens and removes every NFT of a Malicious
 * contract via NftController.removeNft, so it disappears from the UI.
 * Scans are per contract, deduped, batched, and cached. Fail-open: any error
 * or unsupported chain means nothing is removed.
 *
 * @param nfts - NFTs currently being rendered.
 */
export function useNftMaliciousNftScan(nfts: Nft[]): void {
  const nftsRef = useRef(nfts);
  nftsRef.current = nfts;

  const fingerprint = useMemo(
    () =>
      [...new Set(nfts.map(getScanKey).filter((key) => key !== undefined))]
        .sort()
        .join(','),
    [nfts],
  );

  useEffect(() => {
    // Handle verdicts that are already known (e.g. a removal that failed earlier).
    removeMaliciousNfts(nftsRef.current);

    const run = async () => {
      const phishing = Engine.context.PhishingController;
      if (!phishing?.bulkScanTokens) return;

      const missingByChain: Record<string, string[]> = {};
      for (const key of fingerprint ? fingerprint.split(',') : []) {
        if (getCachedVerdict(key) || pendingScans.has(key)) continue;
        pendingScans.add(key);
        const separator = key.indexOf(':');
        (missingByChain[key.slice(0, separator)] ??= []).push(
          key.slice(separator + 1),
        );
      }

      for (const [chainId, addresses] of Object.entries(missingByChain)) {
        for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
          const batch = addresses.slice(i, i + BATCH_SIZE);
          try {
            const results = await phishing.bulkScanTokens({
              chainId,
              tokens: batch,
            });
            // Only store addresses that got a verdict so failures/unsupported chains retry later.
            // Cached even if the list changed meanwhile, so it isn't requested again.
            for (const [address, result] of Object.entries(results ?? {})) {
              if (!result?.result_type) continue;
              verdictCache.set(`${chainId}:${address.toLowerCase()}`, {
                isMalicious:
                  result.result_type === TokenScanResultType.Malicious,
                scannedAt: Date.now(),
              });
            }
          } catch (error) {
            // Fail-open, and a failed batch must not block the remaining ones.
            console.warn('NFT malicious scan failed:', error);
          } finally {
            for (const address of batch) {
              pendingScans.delete(`${chainId}:${address}`);
            }
          }
          removeMaliciousNfts(nftsRef.current);
        }
      }
    };

    run().catch((error: unknown) => {
      // Fail-open: keep every NFT.
      console.warn('NFT malicious scan failed:', error);
    });
  }, [fingerprint]);
}
