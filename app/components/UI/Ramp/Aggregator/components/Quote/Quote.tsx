import React from 'react';
import { View, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  WithTimingConfig,
} from 'react-native-reanimated';
import { QuoteResponse, SellQuoteResponse } from '@consensys/on-ramp-sdk';
import { ProviderEnvironmentTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import Box from '../Box';
import Title from '../../../../../Base/Title';
import {
  renderFiat,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../../../util/number';
import { strings } from '../../../../../../../locales/i18n';
import ApplePayButton from '../../containers/ApplePayButton';
import RemoteImage from '../../../../../Base/RemoteImage';
import TagColored, {
  TagColor,
} from '../../../../../../component-library/components-temp/TagColored';
import styleSheet from './Quote.styles';
import { useStyles } from '../../../../../../component-library/hooks';
import { isBuyQuote } from '../../utils';
import { RampType } from '../../types';
import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';

interface Props {
  quote: QuoteResponse | SellQuoteResponse;
  previouslyUsedProvider?: boolean;
  onPress?: () => void;
  onPressCTA?: () => void;
  highlighted?: boolean;
  isLoading?: boolean;
  showInfo: () => void;
  rampType: RampType;
}

const animationConfig: WithTimingConfig = {
  duration: 150,
  easing: Easing.elastic(0.3),
};

const Quote: React.FC<Props> = ({
  quote,
  previouslyUsedProvider,
  onPress,
  onPressCTA,
  showInfo,
  isLoading,
  highlighted,
  rampType,
}: Props) => {
  const {
    styles,
    theme: { themeAppearance },
  } = useStyles(styleSheet, {});
  const {
    networkFee = 0,
    providerFee = 0,
    amountIn = 0,
    amountOut = 0,
    fiat,
    provider,
    crypto,
    tags,
  } = quote;
  const amountOutInFiat = isBuyQuote(quote, rampType)
    ? quote.amountOutInFiat
    : 0;
  const totalFees = networkFee + providerFee;
  const price = amountIn - totalFees;

  const fiatCode = fiat?.symbol ?? '';
  const fiatSymbol = fiat?.denomSymbol ?? '';

  const shouldShowTags =
    previouslyUsedProvider || tags?.isBestRate || tags?.isMostReliable;

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
    <Animated.View style={animatedOpacity} testID="animated-view-opacity">
      <Box
        onPress={highlighted ? undefined : onPress}
        highlighted={highlighted}
        activeOpacity={0.8}
        accessible={!highlighted}
        accessibilityLabel={quote.provider?.name}
        compact
      >
        <ListItem
          topAccessoryGap={8}
          topAccessory={
            <>
              {shouldShowTags && (
                <View style={styles.tags}>
                  {previouslyUsedProvider ? (
                    <TagColored>
                      {strings('fiat_on_ramp_aggregator.previously_used')}
                    </TagColored>
                  ) : null}

                  {tags?.isMostReliable ? (
                    <TagColored color={TagColor.Info}>
                      {strings('fiat_on_ramp_aggregator.most_reliable')}
                    </TagColored>
                  ) : null}

                  {tags?.isBestRate ? (
                    <TagColored color={TagColor.Success}>
                      {strings('fiat_on_ramp_aggregator.best_rate')}
                    </TagColored>
                  ) : null}
                </View>
              )}
              <TouchableOpacity
                onPress={highlighted ? showInfo : undefined}
                disabled={!highlighted}
                accessibilityLabel={`${quote.provider?.name} logo`}
                accessibilityHint="Shows provider details"
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
            </>
          }
          bottomAccessory={
            <Animated.View
              onLayout={handleOnLayout}
              style={[styles.data, animatedStyle]}
              testID="animated-view-height"
            >
              <View style={styles.buyButton}>
                {isBuyQuote(quote, rampType) && quote.isNativeApplePay ? (
                  <ApplePayButton
                    quote={quote}
                    label={`${
                      quote.provider.environmentType ===
                      ProviderEnvironmentTypeEnum.Staging
                        ? '(Staging) '
                        : ''
                    }${strings('fiat_on_ramp_aggregator.pay_with')}`}
                  />
                ) : (
                  <Button
                    size={ButtonSize.Lg}
                    onPress={() => onPressCTA?.()}
                    label={strings('fiat_on_ramp_aggregator.continue_with', {
                      provider: provider.name,
                    })}
                    variant={ButtonVariants.Primary}
                    width={ButtonWidthTypes.Full}
                    isDisabled={isLoading}
                    loading={isLoading}
                  />
                )}
              </View>
            </Animated.View>
          }
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLGMedium}>
              {isBuyQuote(quote, rampType) ? (
                <>
                  {renderFromTokenMinimalUnit(
                    toTokenMinimalUnit(
                      amountOut,
                      crypto?.decimals ?? 0,
                    ).toString(),
                    crypto?.decimals ?? 0,
                  )}{' '}
                  {crypto?.symbol}
                </>
              ) : (
                `≈ ${fiatSymbol} ${renderFiat(
                  amountOut,
                  fiatCode,
                  fiat?.decimals,
                )}`
              )}
            </Text>
          </ListItemColumn>

          <ListItemColumn>
            <Text variant={TextVariant.BodyLGMedium}>
              {isBuyQuote(quote, rampType) ? (
                <>
                  ≈ {fiatSymbol}{' '}
                  {renderFiat(
                    amountOutInFiat ?? price,
                    fiatCode,
                    fiat?.decimals,
                  )}
                </>
              ) : (
                <>
                  {renderFromTokenMinimalUnit(
                    toTokenMinimalUnit(
                      amountIn,
                      crypto?.decimals ?? 0,
                    ).toString(),
                    crypto?.decimals ?? 0,
                  )}{' '}
                  {crypto?.symbol}
                </>
              )}
            </Text>
          </ListItemColumn>
        </ListItem>
      </Box>
    </Animated.View>
  );
};

export default Quote;
