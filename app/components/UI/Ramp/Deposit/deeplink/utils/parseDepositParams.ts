import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import { DepositIntent, DepositNavigationParams } from '../../types';
import { toChecksumAddress } from '../../../../../../util/address';
import { NATIVE_ADDRESS } from '../../../../../../constants/on-ramp';

function parseIntent(
  pathParams: Record<string, string | undefined>,
): DepositIntent | undefined {
  const depositIntentCandidate = {
    address: pathParams.address,
    chainId: pathParams.chainId,
    assetId: pathParams.assetId,
    amount: pathParams.amount,
    currency: pathParams.currency,
  };

  if (
    !depositIntentCandidate.address &&
    !depositIntentCandidate.assetId &&
    !depositIntentCandidate.chainId &&
    !depositIntentCandidate.amount &&
    !depositIntentCandidate.currency
  ) {
    return undefined;
  }

  if (!depositIntentCandidate.assetId) {
    if (!depositIntentCandidate.chainId) {
      depositIntentCandidate.chainId = '1';
    }

    const assetIdNamespace = toEvmCaipChainId(
      toHex(depositIntentCandidate.chainId),
    );
    let assetIdAssetReference = depositIntentCandidate.address;

    if (!assetIdAssetReference || assetIdAssetReference === NATIVE_ADDRESS) {
      assetIdAssetReference = 'slip44:.';
    } else {
      try {
        const checksumAddress = toChecksumAddress(assetIdAssetReference);
        assetIdAssetReference = `erc20:${checksumAddress}`;
      } catch (error) {
        delete depositIntentCandidate.address;
        delete depositIntentCandidate.chainId;
        delete depositIntentCandidate.assetId;
      }
    }

    if (assetIdAssetReference && assetIdNamespace) {
      depositIntentCandidate.assetId = `${assetIdNamespace}/${assetIdAssetReference}`;
      delete depositIntentCandidate.address;
      delete depositIntentCandidate.chainId;
    } else {
      delete depositIntentCandidate.assetId;
    }
  } else {
    delete depositIntentCandidate.address;
    delete depositIntentCandidate.chainId;
  }

  Object.keys(depositIntentCandidate).forEach(
    (key) =>
      depositIntentCandidate[key as keyof DepositIntent] === undefined &&
      delete depositIntentCandidate[key as keyof DepositIntent],
  );

  return depositIntentCandidate as DepositIntent;
}

export default function parseDepositParams(
  depositParams: Record<string, string | undefined>,
): DepositNavigationParams | undefined {
  const intent = parseIntent(depositParams);

  if (!intent) {
    return undefined;
  }

  return intent as DepositNavigationParams;
}
