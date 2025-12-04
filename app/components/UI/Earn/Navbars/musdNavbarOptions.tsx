import React from 'react';
import { toHex } from '@metamask/controller-utils';
import { Theme } from '../../../../util/theme/models';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import {
  TokenIcon,
  TokenIconVariant,
} from '../../../Views/confirmations/components/token-icon';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { strings } from '../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';

/**
 * Function that returns the navigation options for the mUSD conversion screen
 *
 * @param {Object} navigation - Navigation object required to push new views
 * @param {Theme} theme - Theme object required to style the navbar
 * @param {string} chainId - Chain ID of the mUSD token to convert to
 * @returns {Object} - Corresponding navbar options
 */

// TODO: Add tests.
export const getMusdConversionNavbarOptions = (
  navigation: { goBack: () => void; canGoBack: () => boolean },
  theme: Theme,
  chainId: string,
) => {
  const innerStyles = StyleSheet.create({
    tokenIcon: {
      width: 16,
      height: 16,
      borderRadius: 99,
    },
    headerLeft: {
      marginHorizontal: 8,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerStyle: {
      backgroundColor: theme.colors.background.alternative,
    },
  });

  const chainIdHex = toHex(chainId);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return {
    headerTitleAlign: 'center',
    headerTitle: () => (
      <View style={innerStyles.headerTitle}>
        <TokenIcon
          address={MUSD_TOKEN_ADDRESS_BY_CHAIN[chainIdHex]}
          chainId={chainIdHex}
          variant={TokenIconVariant.Row}
        />
        <Text variant={TextVariant.BodyMDBold}>
          {strings('earn.musd_conversion.convert_to_musd')}
        </Text>
      </View>
    ),
    headerLeft: () => (
      <View style={innerStyles.headerLeft}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Lg}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={handleBackPress}
        />
      </View>
    ),
    headerStyle: innerStyles.headerStyle,
  } as const;
};
