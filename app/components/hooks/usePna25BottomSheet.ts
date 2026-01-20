import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectShouldShowPna25Notice } from '../../selectors/legalNotices';
import Routes from '../../constants/navigation/Routes';
import { useNavigation } from '../../util/navigation/navUtils';

const isE2ETest =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';

/**
 * Hook to handle showing the PNA25 privacy notice bottom sheet
 * Shows the bottom sheet only when:
 * 1. User has completed onboarding
 * 2. PNA25 feature flag is enabled
 * 3. User hasn't acknowledged PNA25 previously
 * 4. MetaMetrics is enabled
 */
export const usePna25BottomSheet = () => {
  const navigation = useNavigation();
  const shouldShowPna25 = useSelector(selectShouldShowPna25Notice);

  const checkAndShowPna25BottomSheet = useCallback(() => {
    if (shouldShowPna25 && !isE2ETest) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET,
      });
    }
  }, [shouldShowPna25, navigation]);

  useEffect(() => {
    checkAndShowPna25BottomSheet();
  }, [checkAndShowPna25BottomSheet]);
};
