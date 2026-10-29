import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getFormattedIpfsUrl, type Nft } from '@metamask/assets-controllers';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import {
  isNftTransferType,
  type ActivityListItem,
  type TokenAmount,
} from '../../../util/activity-adapters';
import type { RootState } from '../../../reducers';
import { selectNftByIdentity } from '../../../selectors/nftController';
import { areAddressesEqual } from '../../../util/address';
import useIpfsGateway from '../../hooks/useIpfsGateway';
/* eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list cache hook */
import { useCachedEvmTransaction } from '../../Views/ActivityList/hooks/activity/useCachedEvmTransaction';

const NFT_ACTIVITY_KINDS = new Set<ActivityListItem['type']>([
  'send',
  'receive',
  'nftBuy',
  'nftMint',
  'nftSell',
]);

interface NftIdentity {
  contractAddress: string;
  tokenId: string;
}

interface NftValueTransfer {
  from?: string;
  to?: string;
  contractAddress?: string;
  tokenId?: string | number;
  transferType?: string;
}

function isNftToken(token: TokenAmount | undefined): boolean {
  return token?.assetType === 'erc721' || token?.assetType === 'erc1155';
}

function isNftActivityItem(item: ActivityListItem): boolean {
  if (item.type === 'send' || item.type === 'receive') {
    return isNftToken(item.data.token);
  }

  return NFT_ACTIVITY_KINDS.has(item.type);
}

function toHexChainId(chainId: string): Hex | undefined {
  try {
    return formatChainIdToHex(chainId);
  } catch {
    return undefined;
  }
}

/**
 * Extracts an NFT activity item's contract address + token id from the indexed
 * transaction's value transfers (the adapter shape omits the token id).
 *
 * Matches the transfer leg by the `from`/`to` on `item.data` so multi-NFT
 * transactions (e.g. an NFT-for-NFT trade) resolve the right token, falling back
 * to the first NFT transfer. Returns `undefined` for non-NFT items or items
 * without an indexed transaction.
 *
 * @param item - The activity list item.
 * @returns The NFT identity, or `undefined`.
 */
function getNftIdentity(
  item: ActivityListItem,
  transfers: NftValueTransfer[] | undefined,
): NftIdentity | undefined {
  if (!isNftActivityItem(item)) {
    return undefined;
  }

  const assetId = item.data.token?.assetId;
  const assetIdMatch = assetId?.match(
    /^(eip155:\d+)\/(?:erc721|erc1155):([^/]+)\/(.+)$/,
  );
  if (assetIdMatch?.[1] === item.chainId) {
    return {
      contractAddress: assetIdMatch[2],
      tokenId: assetIdMatch[3],
    };
  }

  const { from, to } = item.data as { from?: string; to?: string };
  const nftTransfer =
    transfers?.find(
      (transfer) =>
        isNftTransferType(transfer.transferType) &&
        areAddressesEqual(transfer.from ?? '', from ?? '') &&
        areAddressesEqual(transfer.to ?? '', to ?? ''),
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
  const cachedEvmTransaction = useCachedEvmTransaction({
    chainId: isNftActivityItem(item) ? item.chainId : undefined,
    txHash: item.hash,
  });
  const identity = useMemo(
    () =>
      getNftIdentity(
        item,
        cachedEvmTransaction?.valueTransfers as NftValueTransfer[] | undefined,
      ),
    [item, cachedEvmTransaction],
  );
  const hexChainId = useMemo(() => toHexChainId(item.chainId), [item.chainId]);

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
