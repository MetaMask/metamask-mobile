import { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyHubEnabledFlag } from '../../Money/selectors/featureFlags';
import { useSelector } from 'react-redux';

export const useMusdConfirmNavigation = () => {
  const navigation = useNavigation();

  const isMoneyHubEnabled = useSelector(selectMoneyHubEnabledFlag);

  // We must operate on the parent (MainNavigator) stack because the
  // confirmation screen lives inside a nested EarnScreenStack. A plain
  // navigation.navigate() from inside EarnScreenStack would push
  // CashTokensFullView on top without removing EarnScreens, leaving the
  // stale confirmation screen in the back stack. To prevent that:
  //  - pop: if CashTokensFullView is already below (entered from Money Hub)
  //  - replace: if it isn't (entered from TokenListItem or asset detail)
  const handleMoneyHubNavigation = useCallback(() => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      const parentState = parentNavigation.getState();
      const isCashTokensFullViewInStack = parentState.routes.some(
        (route) => route.name === Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );

      if (isCashTokensFullViewInStack) {
        parentNavigation.dispatch(StackActions.pop());
      } else {
        parentNavigation.dispatch(
          StackActions.replace(Routes.WALLET.CASH_TOKENS_FULL_VIEW),
        );
      }
    }
    return;
  }, [navigation]);

  const navigateOnConfirm = useCallback(() => {
    if (isMoneyHubEnabled) {
      handleMoneyHubNavigation();
      return;
    }

    navigation.navigate(Routes.WALLET_VIEW);
  }, [handleMoneyHubNavigation, isMoneyHubEnabled, navigation]);

  return {
    navigateOnConfirm,
  };
};
