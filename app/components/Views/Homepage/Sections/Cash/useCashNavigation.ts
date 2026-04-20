import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';

/**
 * Shared navigation handler for the Cash section education gate.
 *
 * Both CashSection (header tap) and MusdAggregatedRow (row tap) need the
 * same three-way branch: Money home → education screen → full view.
 */
export const useCashNavigation = () => {
  const navigation = useNavigation();
  const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);
  const hasSeenEducation = useSelector(selectMusdConversionEducationSeen);

  const navigateToCash = useCallback(() => {
    if (isMoneyHomeEnabled) {
      navigation.navigate(Routes.MONEY.ROOT);
      return;
    }

    if (!hasSeenEducation) {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          returnTo: { screen: Routes.WALLET.CASH_TOKENS_FULL_VIEW },
        },
      });
      return;
    }

    navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW);
  }, [isMoneyHomeEnabled, hasSeenEducation, navigation]);

  return { navigateToCash, isMoneyHomeEnabled, hasSeenEducation };
};
