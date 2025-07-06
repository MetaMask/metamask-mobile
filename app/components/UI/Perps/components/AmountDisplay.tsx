import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface AmountDisplayProps {
  amount: string;
  currency: string;
  testID?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginBottom: 24,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    amountText: {
      fontSize: 48,
      lineHeight: 60,
      fontWeight: '300',
    },
    cursor: {
      width: 2,
      height: 48,
      backgroundColor: colors.border.default,
      marginHorizontal: 4,
    },
  });

const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency,
  testID = 'amount-display',
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();

    return () => {
      blinkAnimation.stop();
    };
  }, [cursorOpacity]);

  const displayAmount = amount === '0' ? '' : amount;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.amountRow}>
        <Text
          variant={TextVariant.DisplayMD}
          color={TextColor.Default}
          style={styles.amountText}
        >
          {displayAmount}
        </Text>
        {displayAmount === '' && (
          <Animated.View
            style={[styles.cursor, { opacity: cursorOpacity }]}
          />
        )}
        <Text
          variant={TextVariant.DisplayMD}
          color={TextColor.Muted}
          style={styles.amountText}
        >
          {currency}
        </Text>
      </View>
    </View>
  );
};

export default AmountDisplay;
