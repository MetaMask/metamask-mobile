import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import Box from './Box';
import SkeletonText from './SkeletonText';
import DownChevronText from './DownChevronText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';
import { useTheme } from '../../../../../util/theme';

const styles = StyleSheet.create({
  amount: {
    fontSize: 24,
    lineHeight: 32,
  },
  amountWithCursor: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cursor: {
    height: 24,
    marginHorizontal: 5,
    width: 1,
  },
  chevron: {
    flex: 0,
    marginLeft: 8,
  },
});

export interface Props {
  label?: string;
  currencySymbol?: string;
  amount: string;
  currencyCode?: string;
  highlighted?: boolean;
  loading?: boolean;
  highlightedError?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: () => any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCurrencyPress?: () => any;
}

const AmountInput: React.FC<Props> = ({
  label,
  currencySymbol,
  amount,
  currencyCode,
  highlighted,
  loading,
  highlightedError,
  onPress,
  onCurrencyPress,
}: Props) => {
  const { colors } = useTheme();
  const cursorOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const shouldAnimateCursor =
      highlighted && !loading && process.env.NODE_ENV !== 'test';

    if (!shouldAnimateCursor) {
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(1);
      return;
    }

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          duration: 800,
          easing: () => Easing.bounce(1),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          easing: () => Easing.bounce(1),
          duration: 800,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();

    return () => {
      blinkAnimation.stop();
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(0.6);
    };
  }, [cursorOpacity, highlighted, loading]);

  return (
    <Box label={label} highlighted={highlighted} compact>
      <ListItem>
        <ListItemColumn widthType={WidthType.Fill}>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            onPress={onPress}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
            testID={BuildQuoteSelectors.AMOUNT_INPUT}
          >
            {loading ? (
              <SkeletonText medium />
            ) : highlighted ? (
              <View style={styles.amountWithCursor}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.amount}
                  variant={TextVariant.BodyMDMedium}
                  color={highlightedError ? TextColor.Error : TextColor.Default}
                >
                  {currencySymbol || ''}
                  {amount}
                </Text>
                <Animated.View
                  style={[
                    styles.cursor,
                    {
                      backgroundColor: colors.primary.default,
                      opacity: cursorOpacity,
                    },
                  ]}
                  testID={BuildQuoteSelectors.AMOUNT_INPUT_CURSOR}
                />
              </View>
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.amount}
                variant={TextVariant.BodyMDMedium}
                color={highlightedError ? TextColor.Error : TextColor.Default}
              >
                {currencySymbol || ''}
                {amount}
              </Text>
            )}
          </TouchableOpacity>
        </ListItemColumn>

        {onCurrencyPress ? (
          <ListItemColumn style={styles.chevron}>
            {loading ? (
              <SkeletonText small />
            ) : (
              <TouchableOpacity
                accessible
                accessibilityRole="button"
                disabled={!onCurrencyPress}
                onPress={onCurrencyPress}
                hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
                testID={BuildQuoteSelectors.SELECT_CURRENCY}
              >
                <DownChevronText text={currencyCode} />
              </TouchableOpacity>
            )}
          </ListItemColumn>
        ) : null}
      </ListItem>
    </Box>
  );
};

export default AmountInput;
