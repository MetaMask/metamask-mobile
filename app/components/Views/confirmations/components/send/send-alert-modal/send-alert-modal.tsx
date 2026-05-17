import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import type { SendAlert } from '../../../hooks/send/alerts/types';
import { SendAlertModalProps } from './send-alert-modal.types';

function PageNavigation({
  alerts,
  selectedIndex,
  onBack,
  onForward,
}: {
  alerts: SendAlert[];
  selectedIndex: number;
  onBack: () => void;
  onForward: () => void;
}) {
  if (alerts.length <= 1) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full px-4 pb-2"
    >
      <Box twClassName="w-10 items-start justify-center">
        {selectedIndex > 0 ? (
          <ButtonIcon
            accessibilityLabel={strings('send.alert_navigation_previous')}
            iconName={IconName.ArrowLeft}
            onPress={onBack}
            testID="send-alert-modal-nav-back"
          />
        ) : (
          <Box twClassName="w-10" />
        )}
      </Box>
      <Box twClassName="w-10 items-end justify-center">
        {selectedIndex < alerts.length - 1 ? (
          <ButtonIcon
            accessibilityLabel={strings('send.alert_navigation_next')}
            iconName={IconName.ArrowRight}
            onPress={onForward}
            testID="send-alert-modal-nav-forward"
          />
        ) : (
          <Box twClassName="w-10" />
        )}
      </Box>
    </Box>
  );
}

export const SendAlertModal = ({
  isOpen,
  alerts,
  onAcknowledge,
  onClose,
}: SendAlertModalProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const alertKeys = alerts.map((a) => a.key).join('|');

  useEffect(() => {
    setCurrentIndex(0);
  }, [isOpen, alertKeys]);

  const safeIndex = Math.min(currentIndex, Math.max(alerts.length - 1, 0));
  const currentAlert = alerts[safeIndex];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, alerts.length - 1));
  }, [alerts.length]);

  const isOnLastAlert = safeIndex >= Math.max(alerts.length - 1, 0);

  const handleAcknowledgeStep = useCallback(() => {
    if (isOnLastAlert) {
      onAcknowledge();
      return;
    }
    goToNext();
  }, [goToNext, isOnLastAlert, onAcknowledge]);

  if (!isOpen) {
    return null;
  }

  if (!currentAlert) {
    return null;
  }

  const acknowledgeLabel =
    currentAlert.acknowledgeButtonLabel ?? strings('send.i_understand');

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose}>
      <PageNavigation
        alerts={alerts}
        selectedIndex={safeIndex}
        onBack={goToPrevious}
        onForward={goToNext}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName="px-4 pt-2 pb-2"
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.WarningDefault}
        />
        <Text variant={TextVariant.HeadingMd}>{currentAlert.title}</Text>
        <Box twClassName="w-full max-w-full">
          {typeof currentAlert.message === 'string' ? (
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center break-words"
            >
              {currentAlert.message}
            </Text>
          ) : (
            currentAlert.message
          )}
        </Box>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[
          {
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            label: strings('send.cancel'),
            onPress: onClose,
            testID: 'send-alert-modal-cancel-button',
          },
          {
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            label: acknowledgeLabel,
            onPress: handleAcknowledgeStep,
            testID: 'send-alert-modal-acknowledge-button',
          },
        ]}
      />
    </BottomSheet>
  );
};
