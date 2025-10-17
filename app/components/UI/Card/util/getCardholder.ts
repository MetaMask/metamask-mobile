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
}): Promise<{
  cardholderAddresses: string[];
  geoLocation: string;
}> => {
  try {
    if (!cardFeatureFlag || !caipAccountIds?.length) {
      return {
        cardholderAddresses: [],
        geoLocation: 'UNKNOWN',
      };
    }

    const cardSDK = new CardSDK({
      cardFeatureFlag,
    });

    const cardCaipAccountIds = await cardSDK.isCardHolder(caipAccountIds);
    const geoLocation = await cardSDK.getGeoLocation();

    const cardholderAddresses = cardCaipAccountIds.map((cardCaipAccountId) => {
      if (!isCaipAccountId(cardCaipAccountId)) return null;

      const { address } = parseCaipAccountId(cardCaipAccountId);

      if (!isValidHexAddress(address)) return null;

      return address.toLowerCase();
    });

    return {
      cardholderAddresses: cardholderAddresses.filter(Boolean) as string[],
      geoLocation,
    };
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'getCardholder::Error loading cardholder accounts',
    );
    return {
      cardholderAddresses: [],
      geoLocation: 'UNKNOWN',
    };
  }
};
