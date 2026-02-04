import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { RampIntent } from '../types';
import { toHex } from '@metamask/controller-utils';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import { toChecksumAddress } from '../../../../util/address';

function getNativeAssetIdForChain(chainIdDecimal: string): string {
  try {
    return getNativeAssetForChainId(chainIdDecimal).assetId;
  } catch {
    return `${toEvmCaipChainId(toHex(chainIdDecimal))}/slip44:60`;
  }
}

export default function parseRampIntent(
  pathParams: Record<string, string | undefined>,
): RampIntent | undefined {
  // create a rampIntent object if the pathParams contain the necessary fields
  const rampIntentCandidate = {
    address: pathParams.address,
    chainId: pathParams.chainId,
    assetId: pathParams.assetId,
    amount: pathParams.amount,
    currency: pathParams.currency,
  };

  // return with undefined if the pathParams do not contain necessary fields
  if (
    !rampIntentCandidate.address &&
    !rampIntentCandidate.assetId &&
    !rampIntentCandidate.chainId &&
    !rampIntentCandidate.amount &&
    !rampIntentCandidate.currency
  ) {
    return undefined;
  }

  if (!rampIntentCandidate.assetId) {
    // Because assetId is not present, we asssume these are EVM params

    if (!rampIntentCandidate.chainId) {
      rampIntentCandidate.chainId = '1';
    }

    const assetIdNamespace = toEvmCaipChainId(
      toHex(rampIntentCandidate.chainId),
    );
    let assetIdAssetReference = rampIntentCandidate.address;

    if (!assetIdAssetReference || assetIdAssetReference === NATIVE_ADDRESS) {
      const chainIdDecimal = rampIntentCandidate.chainId ?? '1';
      rampIntentCandidate.assetId = getNativeAssetIdForChain(chainIdDecimal);
      delete rampIntentCandidate.address;
      delete rampIntentCandidate.chainId;
    } else {
      try {
        const checksumAddress = toChecksumAddress(assetIdAssetReference);
        assetIdAssetReference = `erc20:${checksumAddress}`;
      } catch (error) {
        delete rampIntentCandidate.address;
        delete rampIntentCandidate.chainId;
        delete rampIntentCandidate.assetId;
      }
    }

    if (
      !rampIntentCandidate.assetId &&
      assetIdAssetReference &&
      assetIdNamespace
    ) {
      rampIntentCandidate.assetId = `${assetIdNamespace}/${assetIdAssetReference}`;
      delete rampIntentCandidate.address;
      delete rampIntentCandidate.chainId;
    } else if (!rampIntentCandidate.assetId) {
      delete rampIntentCandidate.assetId;
    }
  } else {
    // Because assetId is present it takes precedence and we delete address and chainId
    delete rampIntentCandidate.address;
    delete rampIntentCandidate.chainId;
  }

  Object.keys(rampIntentCandidate).forEach(
    (key) =>
      rampIntentCandidate[key as keyof RampIntent] === undefined &&
      delete rampIntentCandidate[key as keyof RampIntent],
  );

  return rampIntentCandidate as RampIntent;
}
