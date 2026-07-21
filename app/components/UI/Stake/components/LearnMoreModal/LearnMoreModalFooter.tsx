import React from 'react';
import { StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button/Button.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';

interface LearnMoreModalFooterProps {
  onClose: () => void;
  onLearnMorePress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LearnMoreModalFooter = ({
  onClose,
  onLearnMorePress,
  style,
}: LearnMoreModalFooterProps) => {
  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('stake.learn_more'),
      size: ButtonSize.Lg,
      labelTextVariant: TextVariant.BodyMDMedium,
      onPress: onLearnMorePress,
    },
    {
      variant: ButtonVariants.Primary,
      label: strings('stake.got_it'),
      labelTextVariant: TextVariant.BodyMDMedium,
      size: ButtonSize.Lg,
      onPress: onClose,
    },
  ];

  return (
    <BottomSheetFooter
      buttonsAlignment={ButtonsAlignment.Horizontal}
      buttonPropsArray={footerButtons}
      style={style}
    />
  );
};

export interface StakingInfoStrings {
  stakeAnyAmount: string;
  noMinimumRequired: string;
  earnRewards: string;
  earnRewardsDescription: string;
  flexibleUnstaking: string;
  flexibleUnstakingDescription: string;
  disclaimer: string;
}

interface StakingInfoBodyTextProps {
  strings: StakingInfoStrings;
  styles: {
    bodyTextContainer: ViewStyle;
    italicText: TextStyle;
  };
}

export const StakingInfoBodyText = ({
  strings: textStrings,
  styles,
}: StakingInfoBodyTextProps) => (
  <View style={styles.bodyTextContainer}>
    <Text variant={TextVariant.BodyMDMedium}>
      {textStrings.stakeAnyAmount}{' '}
      <Text color={TextColor.Alternative}>{textStrings.noMinimumRequired}</Text>
    </Text>
    <Text variant={TextVariant.BodyMDMedium}>
      {textStrings.earnRewards}{' '}
      <Text color={TextColor.Alternative}>
        {textStrings.earnRewardsDescription}
      </Text>
    </Text>
    <Text variant={TextVariant.BodyMDMedium}>
      {textStrings.flexibleUnstaking}{' '}
      <Text color={TextColor.Alternative}>
        {textStrings.flexibleUnstakingDescription}
      </Text>
    </Text>
    <Text
      variant={TextVariant.BodySM}
      color={TextColor.Alternative}
      style={styles.italicText}
    >
      {textStrings.disclaimer}
    </Text>
  </View>
);
