import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  default as MorphText,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';

export function getStakingDepositNavbar({
  title,
  onReject,
}: {
  title: string;
  onReject: () => void;
}) {
  const innerStyles = StyleSheet.create({
    headerLeft: {
      marginHorizontal: 16,
    },
    headerTitle: {
      alignItems: 'center',
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
        testID="staking-deposit-navbar-back-button"
      />
    ),
  };
}
