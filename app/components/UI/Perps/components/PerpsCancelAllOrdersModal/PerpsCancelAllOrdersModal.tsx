import React, { useCallback, useState, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NotificationFeedbackType } from 'expo-haptics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import createStyles from './PerpsCancelAllOrdersModal.styles';
import usePerpsToasts, {
  type PerpsToastOptions,
} from '../../hooks/usePerpsToasts';
import type { Order } from '../../controllers/types';

interface PerpsCancelAllOrdersModalProps {
  isVisible: boolean;
  onClose: () => void;
  orders: Order[];
  onSuccess?: () => void;
}

const PerpsCancelAllOrdersModal: React.FC<PerpsCancelAllOrdersModalProps> = ({
  isVisible,
  onClose,
  orders: _orders,
  onSuccess,
}) => {
  const { styles, theme } = useStyles(createStyles, {});
  const bottomSheetRef = React.useRef<BottomSheetRef>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const { showToast } = usePerpsToasts();

  const showSuccessToast = useCallback(
    (title: string, message?: string) => {
      const toastConfig: PerpsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        backgroundColor: theme.colors.accent03.normal,
        iconColor: theme.colors.accent03.dark,
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
        labelOptions: message
          ? [
              { label: title, isBold: true },
              { label: '\n', isBold: false },
              { label: message, isBold: false },
            ]
          : [{ label: title, isBold: true }],
      } as PerpsToastOptions;
      showToast(toastConfig);
    },
    [showToast, theme.colors.accent03],
  );

  const showErrorToast = useCallback(
    (title: string, message?: string) => {
      const toastConfig: PerpsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        backgroundColor: theme.colors.accent01.light,
        iconColor: theme.colors.accent01.dark,
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
        labelOptions: message
          ? [
              { label: title, isBold: true },
              { label: '\n', isBold: false },
              { label: message, isBold: false },
            ]
          : [{ label: title, isBold: true }],
      } as PerpsToastOptions;
      showToast(toastConfig);
    },
    [showToast, theme.colors.accent01],
  );

  const handleConfirm = useCallback(async () => {
    setIsCanceling(true);
    try {
      const result = await Engine.context.PerpsController.cancelOrders({
        cancelAll: true,
      });

      if (result.success && result.successCount > 0) {
        showSuccessToast(
          strings('perps.cancel_all_modal.success_title'),
          strings('perps.cancel_all_modal.success_message', {
            count: result.successCount,
          }),
        );
        onSuccess?.();
        bottomSheetRef.current?.onCloseBottomSheet();
      } else if (result.successCount > 0 && result.failureCount > 0) {
        // Partial success
        showSuccessToast(
          strings('perps.cancel_all_modal.success_title'),
          strings('perps.cancel_all_modal.partial_success', {
            successCount: result.successCount,
            totalCount: result.successCount + result.failureCount,
          }),
        );
        onSuccess?.();
        bottomSheetRef.current?.onCloseBottomSheet();
      } else {
        showErrorToast(
          strings('perps.cancel_all_modal.error_title'),
          strings('perps.cancel_all_modal.error_message', {
            count: result.failureCount,
          }),
        );
      }
    } catch (error) {
      showErrorToast(
        strings('perps.cancel_all_modal.error_title'),
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setIsCanceling(false);
    }
  }, [showSuccessToast, showErrorToast, onSuccess]);

  const handleKeepOrders = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const footerButtons = useMemo(
    () => [
      {
        label: strings('perps.cancel_all_modal.keep_orders'),
        onPress: handleKeepOrders,
        variant: ButtonVariants.Secondary,
        size: ButtonSize.Lg,
        disabled: isCanceling,
      },
      {
        label: isCanceling
          ? strings('perps.cancel_all_modal.canceling')
          : strings('perps.cancel_all_modal.confirm'),
        onPress: handleConfirm,
        variant: ButtonVariants.Primary,
        size: ButtonSize.Lg,
        disabled: isCanceling,
      },
    ],
    [handleKeepOrders, handleConfirm, isCanceling],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.cancel_all_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.contentContainer}>
        {isCanceling ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.loadingText}
            >
              {strings('perps.cancel_all_modal.canceling')}
            </Text>
          </View>
        ) : (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.cancel_all_modal.description')}
          </Text>
        )}
      </View>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default PerpsCancelAllOrdersModal;
