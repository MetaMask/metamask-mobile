import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import { toChecksumAddress } from '../../../../util/address';

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

    const cardholderAddresses = result.cardholderAccounts.map((account) =>
      toChecksumAddress(account.split(':')[2]),
    );

    return cardholderAddresses;
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'getCardholder::Error loading cardholder accounts',
    );
  }
};
