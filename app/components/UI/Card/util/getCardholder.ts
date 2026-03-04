import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import { isValidHexAddress } from '../../../../util/address';
import { isCaipAccountId, parseCaipAccountId } from '@metamask/utils';
import Engine from '../../../../core/Engine';

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

    const [cardCaipAccountIds, geoLocation] = await Promise.all([
      cardSDK.isCardHolder(caipAccountIds),
      Engine.controllerMessenger
        .call('GeolocationController:getGeolocation')
        .catch(() => 'UNKNOWN'),
    ]);

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
