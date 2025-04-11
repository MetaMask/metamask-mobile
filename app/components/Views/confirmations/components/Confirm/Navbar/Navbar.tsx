import React from 'react';
import { StyleSheet, View } from 'react-native';
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
      // @ts-expect-error - null is the only way to remove the shadow but it's not typed
      shadowOffset: null,
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
