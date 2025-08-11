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

interface ErrorModalProps {
  route: {
    params: {
      title: string;
      description: string;
      dismissLabel?: string;
    };
  };
}

const ErrorModal = ({ route }: ErrorModalProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { title, description, dismissLabel = 'Dismiss' } = route.params;

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderErrorIcon = () => (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="mb-4"
    >
      <Icon
        name={IconName.Danger}
        size={IconSize.Xl}
        style={tw.style('text-warning-default')}
      />
    </Box>
  );

  const renderTitle = () => (
    <Box alignItems={BoxAlignItems.Center} twClassName="mb-3">
      <Text
        variant={TextVariant.HeadingMd}
        style={tw.style('text-center text-default')}
      >
        {title}
      </Text>
    </Box>
  );

  const renderDescription = () => (
    <Box alignItems={BoxAlignItems.Center} twClassName="mb-6">
      <Text variant={TextVariant.BodySm} style={tw.style(' text-alternative')}>
        {description}
      </Text>
    </Box>
  );

  const renderDismissButton = () => (
    <Box twClassName="w-full">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={handleDismiss}
        twClassName="w-full"
      >
        {dismissLabel}
      </Button>
    </Box>
  );

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4"
      >
        {renderErrorIcon()}
        {renderTitle()}
        {renderDescription()}
        {renderDismissButton()}
      </Box>
    </BottomSheet>
  );
};

export default ErrorModal;
