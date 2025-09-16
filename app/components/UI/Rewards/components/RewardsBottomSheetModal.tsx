// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';

import {
  Text,
  TextVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
  Icon,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';

export enum ModalType {
  Danger = 'danger',
  Confirmation = 'confirmation',
}

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

interface RewardsBottomSheetModalProps {
  route: {
    params: {
      title: string | React.ReactNode;
      description: string | React.ReactNode;
      // Enhanced props for generic usage
      type?: ModalType;
      confirmAction: ModalAction;
      onCancel?: () => void;
      cancelLabel?: string;
      showCancelButton?: boolean;
      showIcon?: boolean;
    };
  };
}

const RewardsBottomSheetModal = ({ route }: RewardsBottomSheetModalProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const {
    title,
    description,
    type = ModalType.Danger,
    confirmAction,
    onCancel,
    cancelLabel = 'Cancel',
    showCancelButton = false,
    showIcon = true,
  } = route.params;

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      handleDismiss();
    }
  }, [onCancel, handleDismiss]);

  const renderIcon = () => {
    let iconName = IconName.Danger;
    let iconStyle = 'text-warning-default';

    switch (type) {
      case ModalType.Danger:
        iconName = IconName.Danger;
        iconStyle = 'text-warning-default';
        break;
      case ModalType.Confirmation:
        iconName = IconName.Question;
        iconStyle = 'text-primary-default';
        break;
    }

    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="mb-4"
      >
        <Icon name={iconName} size={IconSize.Xl} style={tw.style(iconStyle)} />
      </Box>
    );
  };

  const renderTitle = () => (
    <Box
      alignItems={
        typeof title === 'string' ? BoxAlignItems.Center : BoxAlignItems.Start
      }
      twClassName="mb-3 w-full"
    >
      {typeof title === 'string' ? (
        <Text
          variant={TextVariant.HeadingMd}
          style={tw.style('text-center text-default')}
        >
          {title}
        </Text>
      ) : (
        title
      )}
    </Box>
  );

  const renderDescription = () => (
    <Box
      alignItems={
        typeof description === 'string'
          ? BoxAlignItems.Center
          : BoxAlignItems.Start
      }
      twClassName="mb-6 w-full"
    >
      {typeof description === 'string' ? (
        <Text
          variant={TextVariant.BodySm}
          style={tw.style('text-alternative text-center')}
        >
          {description}
        </Text>
      ) : (
        description
      )}
    </Box>
  );

  const renderActions = () => {
    // Default actions based on modal type and props
    const hasCancel = showCancelButton || onCancel;

    if (hasCancel) {
      // Two buttons side by side
      return (
        <Box twClassName="w-full" flexDirection={BoxFlexDirection.Row}>
          <Box twClassName="w-1/2 pr-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={handleCancel}
              twClassName="w-full"
            >
              {cancelLabel}
            </Button>
          </Box>
          <Box twClassName="w-1/2 pl-2">
            <Button
              variant={confirmAction.variant || ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={confirmAction.onPress}
              disabled={confirmAction.disabled}
              isDanger={type === ModalType.Danger}
              twClassName="w-full"
            >
              {confirmAction.label}
            </Button>
          </Box>
        </Box>
      );
    }

    // Single button
    return (
      <Box twClassName="w-full">
        <Button
          variant={confirmAction.variant || ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={confirmAction.onPress}
          disabled={confirmAction.disabled}
          isDanger={type === ModalType.Danger}
          twClassName="w-full"
        >
          {confirmAction.label}
        </Button>
      </Box>
    );
  };

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4"
      >
        {showIcon && renderIcon()}
        {renderTitle()}
        {renderDescription()}
        {renderActions()}
      </Box>
    </BottomSheet>
  );
};

export default RewardsBottomSheetModal;
