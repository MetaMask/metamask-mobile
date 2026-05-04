import React from 'react';
import { StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { brandColor } from '@metamask/design-tokens';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';

const GRADIENT_COLORS = [brandColor.lime100, brandColor.lime200];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };

const styles = StyleSheet.create({
  gradientContainer: { flexDirection: 'row' },
  gradient: { flex: 1 },
});

const MoneyGradientText = ({ value }: { value: string }) => {
  const textProps = {
    variant: TextVariant.HeadingMd,
    fontWeight: FontWeight.Bold,
  };
  return (
    <MaskedView
      style={styles.gradientContainer}
      maskElement={
        <Text {...textProps} color={TextColor.TextDefault}>
          {value}
        </Text>
      }
    >
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.gradient}
      >
        <Text
          {...textProps}
          twClassName="opacity-0"
          testID={MoneyPotentialEarningsTestIds.TEXT}
        >
          {value}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default MoneyGradientText;
