import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { selectShouldShowPna25Toast } from '../../selectors/legalNotices';
import { storePna25Acknowledged } from '../../actions/legalNotices';
import Routes from '../../constants/navigation/Routes';

/**
 * Hook to handle showing the PNA25 privacy notice bottom sheet
 * Shows the bottom sheet only when:
 * 1. User has completed onboarding
 * 2. PNA25 feature flag is enabled
 * 3. User hasn't acknowledged PNA25
 * 4. MetaMetrics is enabled
 */
export const usePna25BottomSheet = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const shouldShowPna25 = useSelector(selectShouldShowPna25Toast);

  const checkAndShowPna25BottomSheet = useCallback(() => {
    const isE2ETest =
      process.env.IS_TEST === 'true' ||
      process.env.METAMASK_ENVIRONMENT === 'e2e';

    if (shouldShowPna25 && !isE2ETest) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET,
      });
      // Mark as acknowledged when showing the modal
      dispatch(storePna25Acknowledged());
    }
  }, [shouldShowPna25, navigation, dispatch]);

  useEffect(() => {
    checkAndShowPna25BottomSheet();
  }, [checkAndShowPna25BottomSheet]);
};
