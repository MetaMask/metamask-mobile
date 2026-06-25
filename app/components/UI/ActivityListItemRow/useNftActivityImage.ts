import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getFormattedIpfsUrl, type Nft } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import type { ActivityListItem } from '../../../util/activity-adapters';
import type { RootState } from '../../../reducers';
import { selectNftByIdentity } from '../../../selectors/nftController';
import useIpfsGateway from '../../hooks/useIpfsGateway';

const NFT_ACTIVITY_KINDS = new Set<ActivityListItem['type']>([
  'nftBuy',
  'nftMint',
  'nftSell',
]);

interface NftIdentity {
  contractAddress: string;
  tokenId: string;
}

// Value transfers carry `tokenId` at runtime but it isn't part of the indexed
// API response type, so widen it locally.
interface NftValueTransfer {
  from?: string;
  to?: string;
  contractAddress?: string;
  tokenId?: string | number;
  transferType?: string;
}

function isNftTransferType(transferType?: string): boolean {
  const normalized = transferType?.toLowerCase();
  return normalized === 'erc721' || normalized === 'erc1155';
}

function addressesEqual(a?: string, b?: string): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function caipToHexChainId(chainId: string): Hex | undefined {
  if (chainId.startsWith('0x')) {
    return chainId as Hex;
  }

  const [namespace, reference] = chainId.split(':');
  if (namespace !== 'eip155' || !reference) {
    return undefined;
  }

  const parsed = Number.parseInt(reference, 10);
  return Number.isNaN(parsed) ? undefined : (`0x${parsed.toString(16)}` as Hex);
}

/**
 * Extracts the NFT contract address + token id for an NFT activity item from
 * the indexed transaction's value transfers (the adapter shape doesn't carry
 * the token id). Returns `undefined` for non-NFT kinds or local/keyring items.
 *
 * Selects the NFT leg the adapter classified this activity from — matched by the
 * `from`/`to` it recorded on `item.data` — so a transaction with multiple NFT
 * transfers (e.g. an NFT-for-NFT trade) resolves the correct token rather than
 * whichever NFT transfer happens to come first. Falls back to the first NFT
 * transfer when no leg matches.
 *
 * @param item - The activity list item.
 * @returns The NFT identity, or `undefined`.
 */
function getNftIdentity(item: ActivityListItem): NftIdentity | undefined {
  if (!NFT_ACTIVITY_KINDS.has(item.type)) {
    return undefined;
  }

  if (item.raw?.type !== 'apiEvmTransaction') {
    return undefined;
  }

  const transfers = item.raw.data.valueTransfers as
    | NftValueTransfer[]
    | undefined;

  const { from, to } = item.data as { from?: string; to?: string };
  const nftTransfer =
    transfers?.find(
      (transfer) =>
        isNftTransferType(transfer.transferType) &&
        addressesEqual(transfer.from, from) &&
        addressesEqual(transfer.to, to),
    ) ?? transfers?.find(({ transferType }) => isNftTransferType(transferType));

  const contractAddress = nftTransfer?.contractAddress;
  const tokenId = nftTransfer?.tokenId;
  if (!contractAddress || tokenId === undefined || tokenId === null) {
    return undefined;
  }

  return { contractAddress, tokenId: String(tokenId) };
}

function firstNonEmptyImage(
  ...values: (string | string[] | null | undefined)[]
): string | undefined {
  for (const value of values) {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
}

function pickNftImageCandidate(nft: Nft): string | undefined {
  return firstNonEmptyImage(
    nft.image,
    nft.imageOriginal,
    nft.imagePreview,
    nft.collection?.imageUrl,
    nft.collection?.image,
  );
}

/**
 * Resolves the displayable artwork URL for an NFT activity row by looking the
 * NFT up in the `NftController` (by contract address + token id + chain) and
 * resolving any `ipfs://` image through the configured gateway. Returns
 * `undefined` for non-NFT items or when no NFT/image is found, in which case the
 * avatar falls back to the collection-name initials.
 *
 * @param item - The activity list item.
 * @returns A loadable http(s) image URL, or `undefined`.
 */
export function useNftActivityImage(
  item: ActivityListItem,
): string | undefined {
  const ipfsGateway = useIpfsGateway();
  const identity = useMemo(() => getNftIdentity(item), [item]);
  const hexChainId = useMemo(
    () => caipToHexChainId(item.chainId),
    [item.chainId],
  );

  const nft = useSelector((state: RootState) =>
    identity && hexChainId
      ? selectNftByIdentity(
          state,
          identity.contractAddress,
          identity.tokenId,
          hexChainId,
        )
      : undefined,
  );

  const candidate = useMemo(
    () => (nft ? pickNftImageCandidate(nft) : undefined),
    [nft],
  );

  const [imageUri, setImageUri] = useState<string | undefined>(() =>
    candidate && !candidate.startsWith('ipfs://') ? candidate : undefined,
  );

  useEffect(() => {
    let cancelled = false;

    if (!candidate) {
      setImageUri(undefined);
      return undefined;
    }

    // Only `ipfs://`(`ipfs/`) URLs need gateway resolution; everything else
    // (http(s), data:) is already loadable. Mirrors `getFormattedIpfsUrl`'s
    // accepted input.
    if (!candidate.startsWith('ipfs://')) {
      setImageUri(candidate);
      return undefined;
    }

    getFormattedIpfsUrl(ipfsGateway, candidate, false)
      .then((url) => {
        if (!cancelled) {
          setImageUri(url ?? undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImageUri(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidate, ipfsGateway]);

  return imageUri;
}
