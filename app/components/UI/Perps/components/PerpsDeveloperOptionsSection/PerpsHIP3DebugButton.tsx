import React from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsNavigationParamList } from '../../controllers/types';

export const PerpsHIP3DebugButton = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

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
      variant={ButtonVariants.Secondary}
      size={ButtonSize.Md}
      width={ButtonWidthTypes.Full}
      label="HIP-3 Debug"
      onPress={handleDebugPress}
    />
  );
};
