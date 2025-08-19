import React, { useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendActions } from './useSendActions';

export function useSendNavbar() {
  const { handleCancelPress } = useSendActions();
  const navigation = useNavigation();
  const theme = useTheme();

  const onBackPressRecipient = useCallback(() => {
    navigation.navigate(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.AMOUNT,
    });
  }, [navigation]);

  const onBackPressAmount = useCallback(() => {
    navigation.navigate(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ASSET,
    });
  }, [navigation]);

  const headerStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.background.default,
      shadowColor: 'transparent',
      elevation: 0,
    }),
    [theme.colors.background.default],
  );

  const headerRight = useCallback(
    () => (
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.Close}
        onPress={handleCancelPress}
        twClassName="mr-1"
        testID="send-navbar-close-button"
      />
    ),
    [handleCancelPress],
  );

  const headerTitle = useCallback(
    () => (
      <Box alignItems={BoxAlignItems.Center} twClassName="items-center">
        <Text variant={TextVariant.HeadingMd}>{strings('send.title')}</Text>
      </Box>
    ),
    [],
  );

  const createHeaderLeft = useCallback(
    (onPress: () => void) => () =>
      (
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.ArrowLeft}
          onPress={onPress}
          twClassName="ml-2"
          testID="send-navbar-back-button"
        />
      ),
    [],
  );

  return {
    Amount: {
      headerLeft: createHeaderLeft(onBackPressAmount),
      headerRight,
      headerTitle,
      headerStyle,
    },
    Asset: {
      headerLeft: () => (
        <Box twClassName="ml-4">
          <Text variant={TextVariant.HeadingLg}>{strings('send.title')}</Text>
        </Box>
      ),
      headerRight,
      headerTitle: () => <></>,
      headerStyle,
    },
    Recipient: {
      headerLeft: createHeaderLeft(onBackPressRecipient),
      headerRight,
      headerTitle,
      headerStyle,
    },
  };
}
