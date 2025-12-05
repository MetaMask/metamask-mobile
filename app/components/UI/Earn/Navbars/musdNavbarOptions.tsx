import React from 'react';
import { Theme } from '../../../../util/theme/models';
import { View, StyleSheet, Image } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../util/networks';
import { MUSD_TOKEN } from '../constants/musd';
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
 * @param {string} chainId - Chain ID for the network badge
 * @returns {Object} - Corresponding navbar options
 */

export const getMusdConversionNavbarOptions = (
  navigation: { goBack: () => void; canGoBack: () => boolean },
  theme: Theme,
  chainId: string,
) => {
  const innerStyles = StyleSheet.create({
    tokenIcon: {
      width: 16,
      height: 16,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    headerLeft: {
      marginHorizontal: 8,
    },
    headerTitle: {
      flexDirection: 'row',
      gap: 8,
    },
    headerStyle: {
      backgroundColor: theme.colors.background.alternative,
    },
  });

  const networkImageSource = getNetworkImageSource({
    chainId,
  });

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return {
    headerTitleAlign: 'center',
    headerTitle: () => (
      <View style={innerStyles.headerTitle}>
        <BadgeWrapper
          style={innerStyles.badgeWrapper}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
            />
          }
        >
          <Image
            source={MUSD_TOKEN.imageSource}
            style={innerStyles.tokenIcon}
            testID="musd-token-icon"
          />
        </BadgeWrapper>
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
