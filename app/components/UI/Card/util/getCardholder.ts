import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import { isValidHexAddress } from '../../../../util/address';
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
    });

    const cardCaipAccountIds = await cardSDK.isCardHolder(caipAccountIds);

    const cardholderAddresses = cardCaipAccountIds.map((cardCaipAccountId) => {
      if (!isCaipAccountId(cardCaipAccountId)) return null;

      const { address } = parseCaipAccountId(cardCaipAccountId);

      if (!isValidHexAddress(address)) return null;

      return address.toLowerCase();
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
