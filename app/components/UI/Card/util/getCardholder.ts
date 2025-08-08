import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import {
  isValidHexAddress,
  safeToChecksumAddress,
} from '../../../../util/address';
import { isCaipAccountId, parseCaipAccountId } from '@metamask/utils';

export const getCardholder = async ({
  caipAccountIds,
  cardFeatureFlag,
}: {
  caipAccountIds: `${string}:${string}:${string}`[];
  cardFeatureFlag: CardFeatureFlag | null;
}) => {
  try {
    if (!cardFeatureFlag || !caipAccountIds?.length) {
      return [];
    }

    const cardSDK = new CardSDK({
      cardFeatureFlag,
      rawChainId: LINEA_CHAIN_ID,
    });

    const cardCaipAccountIds = await cardSDK.isCardHolder(caipAccountIds);

    const cardholderAddresses = cardCaipAccountIds.map((cardCaipAccountId) => {
      if (!isCaipAccountId(cardCaipAccountId)) return null;

      const { address } = parseCaipAccountId(cardCaipAccountId);

      if (!isValidHexAddress(address)) return null;

      return safeToChecksumAddress(address);
    });

    return cardholderAddresses.filter(Boolean) as string[];
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'getCardholder::Error loading cardholder accounts',
    );
    return [];
  }
};
