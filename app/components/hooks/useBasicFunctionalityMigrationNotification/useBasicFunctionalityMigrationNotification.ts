import { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { setBasicFunctionalityMigrationNotificationPending } from '../../../actions/settings';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityMigrationNotificationPending } from '../../../selectors/settings';
import {
  selectIsBasicFunctionalitySocialLoginUser,
  selectMobileUxBftcConsolidationFlagEnabled,
} from '../../../selectors/featureFlagController/basicFunctionalityConsolidation';

/**
 * Presents the Basic Functionality migration toast (non-social) or modal
 * (social) once after unlock when the migration left a pending notification.
 */
const useBasicFunctionalityMigrationNotification = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const { toastRef } = useContext(ToastContext);
  const hasPresentedRef = useRef(false);

  const isRemoteFlagEnabled = useSelector(
    selectMobileUxBftcConsolidationFlagEnabled,
  );
  const isNotificationPending = useSelector(
    selectBasicFunctionalityMigrationNotificationPending,
  );
  const isSocialLoginUser = useSelector(
    selectIsBasicFunctionalitySocialLoginUser,
  );

  const dismiss = useCallback(() => {
    dispatch(setBasicFunctionalityMigrationNotificationPending(false));
  }, [dispatch]);

  const openPrivacySettings = useCallback(() => {
    dismiss();
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
    });
  }, [dismiss, navigation]);

  useEffect(() => {
    if (
      !isRemoteFlagEnabled ||
      !isNotificationPending ||
      hasPresentedRef.current
    ) {
      return;
    }

    hasPresentedRef.current = true;

    if (isSocialLoginUser) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
      });
      return;
    }

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Info,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('default_settings.migration_toast.description'),
        },
      ],
      linkButtonOptions: {
        label: strings('default_settings.migration_toast.open_settings'),
        onPress: openPrivacySettings,
      },
    });
    dismiss();
  }, [
    dismiss,
    isNotificationPending,
    isRemoteFlagEnabled,
    isSocialLoginUser,
    navigation,
    openPrivacySettings,
    toastRef,
  ]);
};

export default useBasicFunctionalityMigrationNotification;
