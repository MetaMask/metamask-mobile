import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonsAlignment,
  ButtonSize,
  HeaderStandard,
  IconAlertSeverity,
  Text,
  TextColor,
  TextVariant,
  TitleAlert,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { SuccessErrorSheetParams } from './interface';
import { SuccessErrorSheetSelectorsIDs } from './SuccessErrorSheet.testIds';

export interface SuccessErrorSheetProps {
  route: { params: SuccessErrorSheetParams };
}

const SuccessErrorSheet = ({ route }: SuccessErrorSheetProps) => {
  const {
    onClose,
    title,
    description,
    customButton,
    type = 'success',
    secondaryButtonLabel,
    onSecondaryButtonPress,
    primaryButtonLabel,
    onPrimaryButtonPress,
    isInteractable = true,
    closeOnPrimaryButtonPress = false,
    closeOnSecondaryButtonPress = true,
    reverseButtonOrder = false,
  } = route.params;

  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleHeaderClose = useCallback(() => {
    if (!sheetRef.current) {
      navigation.goBack();
      onClose?.();
      return;
    }
    sheetRef.current.onCloseBottomSheet();
  }, [navigation, onClose]);

  const handleSecondaryButtonPress = () => {
    if (closeOnSecondaryButtonPress) {
      navigation.goBack();
    }
    onSecondaryButtonPress?.();
  };

  const handlePrimaryButtonPress = () => {
    if (closeOnPrimaryButtonPress) {
      navigation.goBack();
    }
    onPrimaryButtonPress?.();
  };

  const hasFooterButtons = Boolean(secondaryButtonLabel || primaryButtonLabel);

  const headerCloseProps = isInteractable
    ? {
        onClose: handleHeaderClose,
        closeButtonProps: {
          testID: SuccessErrorSheetSelectorsIDs.CLOSE_BUTTON,
        },
      }
    : {};

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      onClose={handleClose}
      isInteractable={isInteractable}
      keyboardAvoidingViewEnabled={false}
      testID={SuccessErrorSheetSelectorsIDs.SHEET}
    >
      <HeaderStandard title="" {...headerCloseProps} />
      <Box twClassName="px-4 pb-6 gap-2">
        <TitleAlert
          severity={
            type === 'success'
              ? IconAlertSeverity.Success
              : IconAlertSeverity.Danger
          }
          title={title}
          titleProps={{
            testID: SuccessErrorSheetSelectorsIDs.TITLE,
          }}
        />
        {typeof description === 'string' ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-left"
            testID={SuccessErrorSheetSelectorsIDs.DESCRIPTION}
          >
            {description}
          </Text>
        ) : (
          description
        )}
      </Box>
      {hasFooterButtons ? (
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          primaryButtonProps={
            primaryButtonLabel
              ? {
                  children: primaryButtonLabel,
                  onPress: handlePrimaryButtonPress,
                  size: ButtonSize.Lg,
                  testID: SuccessErrorSheetSelectorsIDs.PRIMARY_BUTTON,
                }
              : undefined
          }
          secondaryButtonProps={
            secondaryButtonLabel
              ? {
                  children: secondaryButtonLabel,
                  onPress: handleSecondaryButtonPress,
                  size: ButtonSize.Lg,
                  testID: SuccessErrorSheetSelectorsIDs.SECONDARY_BUTTON,
                }
              : undefined
          }
          twClassName={reverseButtonOrder ? 'flex-row-reverse' : undefined}
        />
      ) : (
        customButton
      )}
    </BottomSheet>
  );
};

export default SuccessErrorSheet;
