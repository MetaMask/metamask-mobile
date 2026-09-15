import { assetIdsMatch, type QuoteResponse } from '@metamask/bridge-controller';

export type GaslessFeeAsset = NonNullable<
  QuoteResponse['quote']['feeData']['txFee']
>[number]['asset'];

type TxFee = QuoteResponse['quote']['feeData']['txFee'];

export const getGaslessFeeAsset = (
  txFee: TxFee,
): GaslessFeeAsset | undefined => {
  if (!txFee?.length) {
    return undefined;
  }

  const firstAsset = txFee[0].asset;
  if (!firstAsset?.assetId || !firstAsset.symbol) {
    return undefined;
  }

  const hasSingleAsset = txFee.every((fee) =>
    assetIdsMatch(fee.asset?.assetId, firstAsset.assetId),
  );

  return hasSingleAsset ? firstAsset : undefined;
};
