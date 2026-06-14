import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectShouldShowPna25Notice } from '../../selectors/legalNotices';
import Routes from '../../constants/navigation/Routes';

const hasTestOverrides = process.env.HAS_TEST_OVERRIDES === 'true';

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
    if (shouldShowPna25 && !hasTestOverrides) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET,
      });
    }
  }, [shouldShowPna25, navigation]);

  useEffect(() => {
    checkAndShowPna25BottomSheet();
  }, [checkAndShowPna25BottomSheet]);
};
