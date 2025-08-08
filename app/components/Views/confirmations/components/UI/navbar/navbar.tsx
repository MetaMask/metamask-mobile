import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors as importedColors } from '../../../../../../styles/common';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  default as MorphText,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Device from '../../../../../../util/device';
import { Theme } from '../../../../../../util/theme/models';

export function getNavbar({
  title,
  onReject,
  addBackButton = true,
  theme,
}: {
  title: string;
  onReject: () => void;
  addBackButton?: boolean;
  theme: Theme;
}) {
  const innerStyles = StyleSheet.create({
    headerLeft: {
      marginHorizontal: 16,
      display: addBackButton ? undefined : 'none',
    },
    headerTitle: {
      alignItems: 'center',
      marginRight: Device.isAndroid() ? 60 : undefined,
    },
    headerStyle: {
      backgroundColor: theme.colors.background.alternative,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });

  function handleBackPress() {
    if (onReject) {
      onReject();
    }
  }

  return {
    headerTitle: () => (
      <View style={innerStyles.headerTitle}>
        <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>
      </View>
    ),
    headerLeft: () => (
      <ButtonIcon
        size={ButtonIconSizes.Lg}
        iconName={IconName.ArrowLeft}
        onPress={handleBackPress}
        style={innerStyles.headerLeft}
        testID={`${title}-navbar-back-button`}
      />
    ),
    headerStyle: innerStyles.headerStyle,
  };
}

export function useSendAssetNavbar({
  theme,
  onClose,
}: {
  theme: Theme;
  onClose: () => void;
}) {
  const innerStyles = StyleSheet.create({
    headerLeft: {
      marginLeft: 16,
    },
    headerRight: {
      marginHorizontal: 16,
    },
    headerStyle: {
      backgroundColor: theme.colors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });

  const handleClosePress = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    headerLeft: () => (
      <View style={innerStyles.headerLeft}>
        <MorphText variant={TextVariant.HeadingLG}>Send</MorphText>
      </View>
    ),
    headerRight: () => (
      <ButtonIcon
        size={ButtonIconSizes.Lg}
        iconName={IconName.Close}
        onPress={handleClosePress}
        style={innerStyles.headerRight}
        testID="send-asset-navbar-close-button"
      />
    ),
    headerTitle: null,
    headerStyle: innerStyles.headerStyle,
  };
}
