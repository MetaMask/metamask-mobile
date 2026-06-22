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
import { createDepositDevPreviewNavigationParams } from '../../../UI/Ramp/Deposit/dev/depositStackPreviewConfig';

export const NavigationStackPreviewDeveloperOptionsSection = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleOpenDepositScreenPicker = useCallback(() => {
    navigation.navigate(Routes.DEV.DEPOSIT_STACK_PREVIEW);
  }, [navigation]);

  const handleOpenBuildQuote = useCallback(() => {
    navigation.navigate(Routes.DEPOSIT.ID, {
      screen: Routes.DEPOSIT.ROOT,
      params: createDepositDevPreviewNavigationParams({
        screen: Routes.DEPOSIT.BUILD_QUOTE,
      }),
    });
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
        {'Open legacy deposit stack screens for local testing.'}
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
        onPress={handleOpenBuildQuote}
        isFullWidth
      >
        {'Open build quote'}
      </Button>
    </Box>
  );
};
