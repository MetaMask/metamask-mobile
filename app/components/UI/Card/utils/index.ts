import { FlashListAssetKey } from '../../Tokens/TokenList';
import { AllowanceState, CardToken } from '../types';

export const mapAllowanceStateToLabel = (state: AllowanceState): string => {
  switch (state) {
    case AllowanceState.Delegatable:
      return 'Not activated';
    case AllowanceState.Unlimited:
      return 'Unlimited';
    case AllowanceState.Limited:
      return 'Limited';
  }
};

export const mapCardTokenToAssetKey = (
  token: CardToken,
  chainId: string,
  tag?: AllowanceState,
): FlashListAssetKey & {
  tag?: AllowanceState;
} => ({
  address: token.address,
  isStaked: false,
  chainId,
  tag,
});
