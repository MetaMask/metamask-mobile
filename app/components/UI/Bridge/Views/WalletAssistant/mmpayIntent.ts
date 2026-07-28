import { formatAddressToAssetId } from '@metamask/bridge-controller';

import type { RampIntent } from '../../../Ramp/types';
import type { BridgeToken } from '../../types';
import type { WalletAssistantSwapIntent } from './openai';

export const isUnfundedBuyIntent = (
  intent: WalletAssistantSwapIntent,
  hasWalletFunding: boolean,
) =>
  intent.enabled &&
  !intent.sourceSymbol &&
  Boolean(intent.destinationSymbol) &&
  !hasWalletFunding;

export const buildMMPayRampIntent = (
  intent: WalletAssistantSwapIntent,
  destinationToken: BridgeToken | undefined,
): RampIntent => {
  const assetId = destinationToken
    ? formatAddressToAssetId(destinationToken.address, destinationToken.chainId)
    : undefined;

  return {
    assetId,
    amount:
      intent.amountType === 'fiat' && intent.amountValue
        ? intent.amountValue
        : undefined,
  };
};
