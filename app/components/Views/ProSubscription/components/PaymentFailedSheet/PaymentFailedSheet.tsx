import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import {
  NotificationMoment,
  playNotification,
} from '../../../../../util/haptics';
import { PaymentFailedSheetTestIds } from './PaymentFailedSheet.testIds';

interface PaymentFailedSheetProps {
  onClose: () => void;
}

/**
 * Shown when a provisional membership payment does not complete.
 * Try again opens the Money Account add-funds sheet.
 *
 * The monitor lives inside Main, and a processing checkout replaces onto
 * Pro Hub above that screen. iOS draws this sheet in its own window; Android
 * FullWindowOverlay is only a view, so it uses a transparent modal instead.
 * The parent mounts this component only while the sheet is open, so the iOS
 * overlay is not left up over the app accessibility tree.
 */
const PaymentFailedSheet = ({ onClose }: PaymentFailedSheetProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const tryAgainRef = useRef(false);

  useEffect(() => {
    playNotification(NotificationMoment.Error).catch(() => undefined);
  }, []);

  const closeSheet = useCallback(
    (openAddMoney: boolean) => {
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose();
        if (!openAddMoney) {
          return;
        }
        NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
        });
      });
    },
    [onClose],
  );

  const handleClose = useCallback(() => {
    tryAgainRef.current = false;
    closeSheet(false);
  }, [closeSheet]);

  const handleTryAgain = useCallback(() => {
    if (tryAgainRef.current) {
      return;
    }
    tryAgainRef.current = true;
    closeSheet(true);
  }, [closeSheet]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('pro_subscription.payment.try_again'),
      onPress: handleTryAgain,
      testID: PaymentFailedSheetTestIds.TRY_AGAIN,
      size: ButtonSize.Lg,
    }),
    [handleTryAgain],
  );

  const sheet = (
    <ModalSafeAreaProvider>
      <GestureHandlerRootView style={tw.style('flex-1')}>
        <BottomSheet
          ref={sheetRef}
          testID={PaymentFailedSheetTestIds.SHEET}
          keyboardAvoidingViewEnabled={false}
          onClose={onClose}
        >
          <BottomSheetHeader
            onClose={handleClose}
            closeButtonProps={{
              testID: PaymentFailedSheetTestIds.CLOSE,
            }}
          >
            <Box twClassName="flex-row items-center gap-2">
              <Icon
                name={IconName.Danger}
                color={IconColor.ErrorDefault}
                size={IconSize.Lg}
              />
              <Text
                variant={TextVariant.HeadingSm}
                testID={PaymentFailedSheetTestIds.TITLE}
              >
                {strings('pro_subscription.payment.failed_title')}
              </Text>
            </Box>
          </BottomSheetHeader>
          <Box twClassName="px-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={PaymentFailedSheetTestIds.BODY}
            >
              {strings('pro_subscription.payment.failed_body')}
            </Text>
          </Box>
          <BottomSheetFooter
            primaryButtonProps={primaryButtonProps}
            twClassName="pt-6"
          />
        </BottomSheet>
      </GestureHandlerRootView>
    </ModalSafeAreaProvider>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{sheet}</FullWindowOverlay>;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      {sheet}
    </Modal>
  );
};

export default PaymentFailedSheet;
