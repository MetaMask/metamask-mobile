import type { ImageSourcePropType } from 'react-native';
import musdAssetIcon from '../../../../images/musd-icon-2x.png';
import type { CardFundingToken } from '../types';
import { buildTokenIconUrl } from './buildTokenIconUrl';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from './vedaToken';

export interface CardTokenDisplay {
  symbol: string;
  iconSource: ImageSourcePropType;
}

export const getCardTokenDisplay = (
  token: Partial<
    Pick<
      CardFundingToken,
      | 'address'
      | 'caipChainId'
      | 'symbol'
      | 'displaySymbol'
      | 'isMoneyAccountEntry'
    >
  >,
): CardTokenDisplay => {
  const shouldRenderAsMoneyAccount =
    token.displaySymbol === MONEY_ACCOUNT_DISPLAY_SYMBOL ||
    token.isMoneyAccountEntry === true;

  if (shouldRenderAsMoneyAccount) {
    return {
      symbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
      iconSource: musdAssetIcon,
    };
  }

  return {
    symbol: token.symbol ?? '',
    iconSource: {
      uri: buildTokenIconUrl(token.caipChainId, token.address ?? ''),
    },
  };
};
