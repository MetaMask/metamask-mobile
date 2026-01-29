import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';

export const PerpsCoreTesterButton = () => {
  const navigation = useNavigation();

  const handlePress = () => {
    // Navigate to standalone screen outside Perps providers
    navigation.navigate(Routes.DEBUG.PERPS_CORE_TESTER);
  };

  if (!__DEV__) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariants.Secondary}
      size={ButtonSize.Md}
      width={ButtonWidthTypes.Full}
      label="Core Tester"
      onPress={handlePress}
    />
  );
};
