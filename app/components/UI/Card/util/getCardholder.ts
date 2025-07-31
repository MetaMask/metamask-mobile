import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import { isValidHexAddress, toChecksumAddress } from '../../../../util/address';

export const getCardholder = async ({
  formattedAccounts,
  cardFeatureFlag,
}: {
  formattedAccounts: `eip155:${string}:0x${string}`[];
  cardFeatureFlag: CardFeatureFlag;
}) => {
  try {
    if (!cardFeatureFlag || !formattedAccounts?.length) {
      return [];
    }

    const cardSDK = new CardSDK({
      cardFeatureFlag,
      rawChainId: LINEA_CHAIN_ID,
    });

    const result = await cardSDK.isCardHolder(formattedAccounts);
    const mappedAccounts = result.cardholderAccounts.map((caip10Account) => {
      const parts = caip10Account.split(':');
      if (parts.length < 3) {
        Logger.log(
          `getCardholder::Invalid account format: ${caip10Account}. Expected format is CAIP-10`,
        );
        return null;
      }
      const address = parts[2];

      if (!isValidHexAddress(address)) {
        return null;
      }

      return toChecksumAddress(address);
    });

    const cardholderAddresses = mappedAccounts.filter(Boolean) as string[];

    return cardholderAddresses;
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'getCardholder::Error loading cardholder accounts',
    );
    return [];
  }
};
