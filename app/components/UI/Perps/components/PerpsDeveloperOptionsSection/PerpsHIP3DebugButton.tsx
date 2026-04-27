import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';

export const PerpsHIP3DebugButton = () => {
  const navigation = useNavigation();

  const handleDebugPress = () => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.HIP3_DEBUG,
    });
  };

  // Only show in development builds
  if (!__DEV__) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      isFullWidth
      onPress={handleDebugPress}
    >
      HIP-3 Debug
    </Button>
  );
};
