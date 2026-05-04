import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { MusdNavigationTarget } from '../../../../UI/Earn/types/musd.types';

/**
 * Shared navigation handler for the Cash section education gate.
 */
export const useCashNavigation = () => {
  const navigation = useNavigation();
  const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);
  const hasSeenEducation = useSelector(selectMusdConversionEducationSeen);

  const navigateToCash = useCallback(() => {
    const destination: MusdNavigationTarget = isMoneyHomeEnabled
      ? { screen: Routes.MONEY.ROOT, params: { screen: Routes.MONEY.HOME } }
      : { screen: Routes.WALLET.CASH_TOKENS_FULL_VIEW };

    if (!hasSeenEducation) {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: { returnTo: destination },
      });
      return;
    }

    navigation.navigate(destination.screen, destination.params);
  }, [isMoneyHomeEnabled, hasSeenEducation, navigation]);

  return { navigateToCash, isMoneyHomeEnabled, hasSeenEducation };
};
