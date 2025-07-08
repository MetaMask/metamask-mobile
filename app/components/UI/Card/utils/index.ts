import { strings } from '../../../../../locales/i18n';
import { FlashListAssetKey } from '../../Tokens/TokenList';
import { AllowanceState, CardToken } from '../types';

export const mapAllowanceStateToLabel = (state: AllowanceState): string => {
  switch (state) {
    case AllowanceState.NotActivated:
      return strings('card.allowance_states.not_activated');
    case AllowanceState.Unlimited:
      return strings('card.allowance_states.unlimited');
    case AllowanceState.Limited:
      return strings('card.allowance_states.limited');
  }
};

export const mapCardTokenToAssetKey = (
  token: CardToken,
  chainId: string,
): FlashListAssetKey & {
  tag?: AllowanceState;
} => ({
  address: token.address,
  isStaked: false,
  chainId,
});
