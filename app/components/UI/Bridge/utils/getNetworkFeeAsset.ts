import { assetIdsMatch, type QuoteResponse } from '@metamask/bridge-controller';
import { parseCaipAssetType } from '@metamask/utils';
import { getAssetImageUrl } from '../hooks/useAssetMetadata/utils';

export type NetworkFeeAsset = NonNullable<
  QuoteResponse['quote']['feeData']['txFee']
>[number]['asset'];

type TxFee = QuoteResponse['quote']['feeData']['txFee'];
type NetworkFee = QuoteResponse['quote']['feeData']['network'];

export const getNetworkFeeAsset = (
  fees: TxFee | NetworkFee,
): NetworkFeeAsset | undefined => {
  if (!fees?.length) {
    return undefined;
  }

  const firstAsset = fees[0].asset;
  if (!firstAsset?.assetId || !firstAsset.symbol) {
    return undefined;
  }

  const hasSingleAsset = fees.every((fee) =>
    assetIdsMatch(fee.asset?.assetId, firstAsset.assetId),
  );
  if (!hasSingleAsset) {
    return undefined;
  }

  return firstAsset.iconUrl
    ? firstAsset
    : {
        ...firstAsset,
        iconUrl: getAssetImageUrl(
          firstAsset.assetId,
          parseCaipAssetType(firstAsset.assetId).chainId,
        ),
      };
};
