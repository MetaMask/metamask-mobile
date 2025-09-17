// Third party dependencies.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, TouchableOpacity } from 'react-native';
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
import BannerAlert from '../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../component-library/components/Banners/Banner';
import TextField, {
  TextFieldSize,
} from '../../../../component-library/components/Form/TextField';
import { formatUrl } from '../utils/formatUtils';

export enum ModalType {
  Danger = 'danger',
  Confirmation = 'confirmation',
}

export interface ModalAction {
  label: string;
  onPress: (inputValue?: string) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export interface RewardsBottomSheetModalProps {
  route: {
    params: {
      title: string | React.ReactNode;
      description: string | React.ReactNode;
      claimUrl?: string;
      // Enhanced props for generic usage
      type?: ModalType;
      confirmAction: ModalAction;
      onCancel?: () => void;
      cancelLabel?: string;
      showCancelButton?: boolean;
      showIcon?: boolean;
      showInput?: boolean;
      inputPlaceholder?: string;
      error?: string;
    };
  };
}

const RewardsBottomSheetModal = ({ route }: RewardsBottomSheetModalProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const [inputValue, setInputValue] = useState('');
  const {
    title,
    description,
    claimUrl,
    type = ModalType.Danger,
    confirmAction,
    onCancel,
    cancelLabel = 'Cancel',
    showCancelButton = false,
    showIcon = true,
    showInput = false,
    inputPlaceholder,
    error,
  } = route.params;

  const buttonDisabled = useMemo(
    () => confirmAction.disabled || (showInput && !inputValue.trim()),
    [confirmAction.disabled, showInput, inputValue],
  );

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
      twClassName="mb-4 w-full"
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
      {claimUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(claimUrl)}
          style={tw.style('mt-2 flex-row items-center justify-center')}
        >
          <Text
            variant={TextVariant.BodySm}
            style={tw.style('text-primary-default underline mr-1')}
          >
            {formatUrl(claimUrl)}
          </Text>
          <Icon
            name={IconName.Export}
            size={IconSize.Sm}
            style={tw.style('text-primary-default')}
          />
        </TouchableOpacity>
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
              onPress={() => confirmAction.onPress(inputValue)}
              disabled={buttonDisabled}
              isDanger={type === ModalType.Danger}
              twClassName="w-full"
              style={tw.style(buttonDisabled && 'opacity-50')}
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
          onPress={() => confirmAction.onPress(inputValue)}
          disabled={buttonDisabled}
          isDanger={type === ModalType.Danger}
          twClassName="w-full"
          style={tw.style(buttonDisabled && 'opacity-50')}
        >
          {confirmAction.label}
        </Button>
      </Box>
    );
  };

  const renderError = () => {
    if (error) {
      return (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          description={error}
          style={tw.style('my-4')}
        />
      );
    }
    return null;
  };

  const renderInput = () => {
    if (showInput) {
      return (
        <TextField
          placeholder={inputPlaceholder}
          onChangeText={setInputValue}
          value={inputValue}
          size={TextFieldSize.Lg}
          style={tw.style('bg-background-pressed my-4')}
        />
      );
    }
    return null;
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
        {renderInput()}
        {renderError()}
        {renderActions()}
      </Box>
    </BottomSheet>
  );
};

export default RewardsBottomSheetModal;
