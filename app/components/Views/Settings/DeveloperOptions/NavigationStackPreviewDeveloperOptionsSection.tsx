import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import Routes from '../../../../constants/navigation/Routes';
import { createDepositNavigationDetails } from '../../../UI/Ramp/Deposit/routes/utils';

export const NavigationStackPreviewDeveloperOptionsSection = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleOpenDepositScreenPicker = useCallback(() => {
    navigation.navigate(Routes.DEV.DEPOSIT_STACK_PREVIEW);
  }, [navigation]);

  const handleOpenRampDeposit = useCallback(() => {
    navigation.navigate(...createDepositNavigationDetails());
  }, [navigation]);

  return (
    <Box twClassName="gap-2">
      <Text variant={TextVariant.HeadingLg} style={styles.heading}>
        {'Deposit navigation preview'}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {
          'Open legacy ramp deposit screens for navigation and header testing.'
        }
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={handleOpenDepositScreenPicker}
        isFullWidth
      >
        {'Deposit screen picker'}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={handleOpenRampDeposit}
        isFullWidth
      >
        {'Ramp deposit (legacy)'}
      </Button>
    </Box>
  );
};
