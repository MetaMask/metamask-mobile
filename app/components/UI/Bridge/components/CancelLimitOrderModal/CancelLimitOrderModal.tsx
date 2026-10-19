import React, { useCallback, useRef } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CancelLimitOrderModalSelectorsIDs } from './testIds';
import type { CancelLimitOrderModalProps } from './types';

export const CancelLimitOrderModal = ({
  onConfirm,
  isCancelling = false,
  error,
  onClose,
  goBack,
  testID = CancelLimitOrderModalSelectorsIDs.SHEET,
}: CancelLimitOrderModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={testID}
      goBack={goBack}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: CancelLimitOrderModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.cancel_order')}
      </BottomSheetHeader>
      {error && (
        <Box paddingHorizontal={3} paddingBottom={2}>
          <BannerAlert
            descriptionProps={{
              variant: TextVariant.BodySm,
              color: TextColor.TextDefault,
            }}
            severity={BannerAlertSeverity.Danger}
            description={error}
            testID={CancelLimitOrderModalSelectorsIDs.ERROR_BANNER}
          />
        </Box>
      )}
      <Box
        alignItems={BoxAlignItems.Center}
        paddingHorizontal={4}
        paddingBottom={4}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={CancelLimitOrderModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.limit.cancel_order_confirmation')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: error
            ? strings('bridge.limit.try_again')
            : strings('bridge.confirm'),
          onPress: onConfirm,
          isLoading: isCancelling,
          testID: CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};
