import React, { useMemo, useCallback, useEffect } from 'react';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useSendContext } from '../../context/send-context/send-context';
import { useSendActions } from './useSendActions';

export function useSendNavbar({ currentRoute }: { currentRoute: string }) {
  const navigation = useNavigation();
  const { handleCancelPress, handleBackPress } = useSendActions();
  const { updateTo, updateAsset } = useSendContext();
  const theme = useTheme();
  const tw = useTailwind();

  const onBackPress = useCallback(() => {
    if (currentRoute === Routes.SEND.RECIPIENT) {
      updateTo('');
    }
    if (currentRoute === Routes.SEND.AMOUNT) {
      updateAsset(undefined);
    }
    handleBackPress();
  }, [currentRoute, updateTo, updateAsset, handleBackPress]);

  const styles = useMemo(
    () => ({
      headerLeft: tw`ml-4`,
      headerRight: tw`mx-4`,
      headerTitle: tw`items-center`,
      headerStyle: {
        backgroundColor: theme.colors.background.default,
        shadowColor: 'transparent',
        elevation: 0,
      },
    }),
    [theme.colors.background.default, tw],
  );

  const headerLeft = useCallback(
    () => (
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.ArrowLeft}
        onPress={onBackPress}
        twClassName="ml-2"
        testID="send-navbar-back-button"
      />
    ),
    [onBackPress],
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

  const navigationOptions = useMemo(() => {
    const baseOptions = {
      headerLeft,
      headerRight,
      headerTitle,
      headerStyle: styles.headerStyle,
    };

    if (currentRoute === Routes.SEND.ASSET) {
      return {
        ...baseOptions,
        headerLeft: () => (
          <Box twClassName="ml-4">
            <Text variant={TextVariant.HeadingLg}>{strings('send.title')}</Text>
          </Box>
        ),
        headerTitle: null,
      };
    }

    return baseOptions;
  }, [currentRoute, headerLeft, headerRight, headerTitle, styles.headerStyle]);

  useEffect(() => {
    navigation.setOptions(navigationOptions);
  }, [navigation, navigationOptions]);
}
