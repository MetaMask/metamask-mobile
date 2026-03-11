import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
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
  tokenSymbol?: string;
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
  tokenSymbol,
  onPress,
  onCurrencyPress,
}: Props) => {
  const { colors } = useTheme();
  const cursorOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          duration: 800,
          easing: Easing.bounce,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          easing: Easing.bounce,
          duration: 800,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();

    return () => {
      blinkAnimation.stop();
    };
  }, [cursorOpacity]);

  const textColor = highlightedError ? TextColor.Error : TextColor.Default;

  const renderAmountContent = () => {
    if (loading) {
      return <SkeletonText medium />;
    }

    if (highlighted) {
      const cursorView = (
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
      );

      // For sell: show "12.5 | ETH" with cursor before token symbol
      if (tokenSymbol) {
        const amountWithoutSymbol = amount.replace(tokenSymbol, '').trimEnd();

        return (
          <View style={styles.amountWithCursor}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.amount}
              variant={TextVariant.BodyMDMedium}
              color={textColor}
            >
              {amountWithoutSymbol}
            </Text>
            {cursorView}
            <Text
              style={styles.amount}
              variant={TextVariant.BodyMDMedium}
              color={textColor}
            >
              {' '}
              {tokenSymbol}
            </Text>
          </View>
        );
      }

      // For buy: show "$100 |" with cursor after amount
      return (
        <View style={styles.amountWithCursor}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.amount}
            variant={TextVariant.BodyMDMedium}
            color={textColor}
          >
            {currencySymbol || ''}
            {amount}
          </Text>
          {cursorView}
        </View>
      );
    }

    return (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.amount}
        variant={TextVariant.BodyMDMedium}
        color={textColor}
      >
        {currencySymbol || ''}
        {amount}
      </Text>
    );
  };

  return (
    <Box label={label} highlighted={highlighted} compact>
      <ListItem>
        <ListItemColumn widthType={WidthType.Fill}>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${currencySymbol || ''}${amount}`}
            onPress={onPress}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
            testID={BuildQuoteSelectors.AMOUNT_INPUT}
          >
            {renderAmountContent()}
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
