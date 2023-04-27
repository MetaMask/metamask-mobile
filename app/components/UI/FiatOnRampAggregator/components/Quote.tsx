import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  WithTimingConfig,
} from 'react-native-reanimated';
import { QuoteResponse } from '@consensys/on-ramp-sdk';
import Box from './Box';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import BaseListItem from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import {
  renderFiat,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import ApplePayButton from '../containers/ApplePayButton';
import { useTheme } from '../../../../util/theme';
import RemoteImage from '../../../Base/RemoteImage';

import { Colors } from '../../../../util/theme/models';

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    fee: {
      marginLeft: 8,
    },
    buyButton: {
      marginTop: 10,
    },
    title: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoIcon: {
      marginLeft: 8,
      color: colors.icon.alternative,
    },
    data: {
      marginTop: 4,
      overflow: 'hidden',
    },
  });

interface Props {
  quote: QuoteResponse;
  onPress?: () => any;
  onPressBuy?: () => any;
  highlighted?: boolean;
  isLoading?: boolean;
  showInfo: () => any;
}

const animationConfig: WithTimingConfig = {
  duration: 150,
  easing: Easing.elastic(0.3),
};

const Quote: React.FC<Props> = ({
  quote,
  onPress,
  onPressBuy,
  showInfo,
  isLoading,
  highlighted,
}: Props) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const {
    networkFee = 0,
    providerFee = 0,
    amountIn = 0,
    amountOut = 0,
    fiat,
    provider,
    crypto,
  } = quote;
  const totalFees = networkFee + providerFee;
  const price = amountIn - totalFees;

  const fiatCode = fiat?.symbol || '';
  const fiatSymbol = fiat?.denomSymbol || '';

  const expandedHeight = useSharedValue(0);
  const handleOnLayout = (event: LayoutChangeEvent) => {
    const { nativeEvent } = event;
    if (expandedHeight.value === 0) {
      expandedHeight.value = nativeEvent.layout.height;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (expandedHeight.value > 0) {
      return {
        height: highlighted
          ? withTiming(expandedHeight.value, animationConfig)
          : withTiming(0, animationConfig),
        opacity: highlighted ? withTiming(1, animationConfig) : withTiming(0),
      };
    }
    return {};
  });

  const animatedOpacity = useAnimatedStyle(() => ({
    opacity: expandedHeight.value ? withDelay(10, withTiming(1)) : 0,
  }));

  return (
    <Animated.View style={animatedOpacity}>
      <Box
        onPress={highlighted ? undefined : onPress}
        highlighted={highlighted}
        activeOpacity={0.8}
        accessible={!highlighted}
        accessibilityLabel={quote.provider?.name}
      >
        <ListItem.Content>
          <ListItem.Body>
            <TouchableOpacity
              onPress={highlighted ? showInfo : undefined}
              disabled={!highlighted}
              accessibilityLabel={quote.provider?.name}
            >
              <View style={styles.title}>
                {quote.provider?.logos?.[themeAppearance] ? (
                  <RemoteImage
                    style={{
                      width: quote.provider.logos.width,
                      height: quote.provider.logos.height,
                    }}
                    source={{ uri: quote.provider?.logos?.[themeAppearance] }}
                  />
                ) : (
                  <Title>{quote?.provider?.name}</Title>
                )}

                {quote?.provider && (
                  <Feather name="info" size={12} style={styles.infoIcon} />
                )}
              </View>
            </TouchableOpacity>
          </ListItem.Body>
          <ListItem.Amounts>
            <Text big primary bold right>
              {renderFromTokenMinimalUnit(
                toTokenMinimalUnit(amountOut, crypto?.decimals || 0).toString(),
                crypto?.decimals || 0,
              )}{' '}
              {crypto?.symbol}
            </Text>
          </ListItem.Amounts>
        </ListItem.Content>

        <Animated.View
          onLayout={handleOnLayout}
          style={[styles.data, animatedStyle]}
        >
          <ListItem.Content>
            <ListItem.Body>
              <Text small>
                {strings('fiat_on_ramp_aggregator.price')} {fiatCode}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <Text small right>
                ≈ {fiatSymbol} {renderFiat(price, fiatCode, fiat?.decimals)}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>

          <ListItem.Content>
            <ListItem.Body>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.total_fees')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <Text black small right>
                {fiatSymbol} {renderFiat(totalFees, fiatCode, fiat?.decimals)}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>

          <ListItem.Content>
            <ListItem.Body>
              <Text grey small style={styles.fee}>
                {strings('fiat_on_ramp_aggregator.processing_fee')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <Text grey small right>
                {fiatSymbol} {renderFiat(providerFee, fiatCode, fiat?.decimals)}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>

          <ListItem.Content>
            <ListItem.Body>
              <Text grey small style={styles.fee}>
                {strings('fiat_on_ramp_aggregator.network_fee')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <Text grey small right>
                {fiatSymbol}
                {renderFiat(networkFee, fiatCode, fiat?.decimals)}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>

          <ListItem.Content>
            <ListItem.Body>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.total')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <Text black small right>
                {fiatSymbol} {renderFiat(amountIn, fiatCode, fiat?.decimals)}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>

          <View style={styles.buyButton}>
            {quote.paymentMethod?.isApplePay ? (
              <ApplePayButton
                quote={quote}
                label={strings('fiat_on_ramp_aggregator.pay_with')}
              />
            ) : (
              <StyledButton
                type={'blue'}
                onPress={onPressBuy}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size={'small'}
                    color={colors.primary.inverse}
                  />
                ) : (
                  strings('fiat_on_ramp_aggregator.buy_with', {
                    provider: provider.name,
                  })
                )}
              </StyledButton>
            )}
          </View>
        </Animated.View>
      </Box>
    </Animated.View>
  );
};

export default Quote;
