import React, { useState, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import I18n, { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import createStyles from './QuoteDetailsCard.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Box } from '../../../Box/Box';
import {
  FlexDirection,
  AlignItems,
  JustifyContent,
} from '../../../Box/box.types';
import Routes from '../../../../../constants/navigation/Routes';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectDestToken,
  selectSourceToken,
  selectIsEvmSolanaBridge,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import BigNumber from 'bignumber.js';
import { getIntlNumberFormatter } from '../../../../../util/intl';

const ANIMATION_DURATION_MS = 50;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QuoteDetailsCard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = createStyles(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const rotationValue = useSharedValue(0);

  const locale = I18n.locale;
  const intlNumberFormatter = getIntlNumberFormatter(locale, {
    maximumFractionDigits: 3,
  });

  const { formattedQuoteData, activeQuote } = useBridgeQuoteData();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const isEvmSolanaBridge = useSelector(selectIsEvmSolanaBridge);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);

  const isSameChainId = sourceToken?.chainId === destToken?.chainId;
  // Initialize expanded state based on whether destination is Solana or it's a Solana swap
  useEffect(() => {
    if (isSameChainId || !isEvmSolanaBridge) {
      setIsExpanded(true);
    }
  }, [isEvmSolanaBridge, isSameChainId]);

  const toggleAccordion = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        ANIMATION_DURATION_MS,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );

    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    rotationValue.value = withTiming(newExpandedState ? 1 : 0, {
      duration: ANIMATION_DURATION_MS,
    });
  }, [isExpanded, rotationValue]);

  const arrowStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotationValue.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const handleSlippagePress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SLIPPAGE_MODAL,
    });
  };

  // Early return for invalid states
  if (
    !sourceToken?.chainId ||
    !destToken?.chainId ||
    !sourceAmount ||
    !formattedQuoteData
  ) {
    return null;
  }

  const { networkFee, estimatedTime, rate, priceImpact, slippage } =
    formattedQuoteData;

  // Check if price impact warning should be shown
  const gasIncluded = !!activeQuote?.quote.gasIncluded;
  const rawPriceImpact = activeQuote?.quote.priceData?.priceImpact;
  const shouldShowPriceImpactWarning =
    rawPriceImpact !== undefined &&
    bridgeFeatureFlags?.priceImpactThreshold &&
    ((gasIncluded &&
      Number(rawPriceImpact) >=
        bridgeFeatureFlags.priceImpactThreshold.gasless) ||
      (!gasIncluded &&
        Number(rawPriceImpact) >=
          bridgeFeatureFlags.priceImpactThreshold.normal));

  const hasFee = activeQuote
    ? new BigNumber(activeQuote.quote.feeData.metabridge.amount).gt(0)
    : false;

  const formattedMinToTokenAmount = intlNumberFormatter.format(
    parseFloat(activeQuote?.minToTokenAmount.amount || '0'),
  );

  return (
    <Box>
      <Box style={styles.container}>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.flexEnd}
        >
          {!isSameChainId && isEvmSolanaBridge && (
            <Animated.View style={arrowStyle}>
              <TouchableOpacity
                onPress={toggleAccordion}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  isExpanded ? 'Collapse quote details' : 'Expand quote details'
                }
                testID="expand-quote-details"
              >
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={theme.colors.icon.muted}
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Box>

        {/* Always visible content */}
        <KeyValueRow
          field={{
            label: {
              text: strings('bridge.rate'),
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: strings('bridge.quote_info_title'),
              content: strings('bridge.quote_info_content'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: (
              <Text
                variant={TextVariant.BodyMD}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {rate}
              </Text>
            ),
          }}
        />
        {activeQuote?.quote.gasIncluded ? (
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.spaceBetween}
          >
            <Text variant={TextVariant.BodyMDMedium}>
              {strings('bridge.network_fee')}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={8}
            >
              <Text
                variant={TextVariant.BodyMD}
                style={styles.strikethroughText}
              >
                {networkFee}
              </Text>
              <Text variant={TextVariant.BodyMD}>
                {strings('bridge.included')}
              </Text>
            </Box>
          </Box>
        ) : (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.network_fee'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.network_fee_info_title'),
                content: strings('bridge.network_fee_info_content'),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: networkFee,
                variant: TextVariant.BodyMD,
              },
            }}
          />
        )}

        {priceImpact && (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.price_impact'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.price_impact_info_title'),
                content: gasIncluded
                  ? strings('bridge.price_impact_info_gasless_description')
                  : strings('bridge.price_impact_info_description'),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: priceImpact,
                variant: TextVariant.BodyMD,
                color: shouldShowPriceImpactWarning
                  ? TextColor.Error
                  : undefined,
              },
            }}
          />
        )}

        {/* Quote info with gradient overlay */}
        <Box>
          {!isExpanded && (
            <Box style={styles.gradientContainer}>
              <Svg height="30" width="100%">
                <Defs>
                  <LinearGradient id="fadeGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop
                      offset="0"
                      stopColor={theme.colors.background.default}
                      stopOpacity="0"
                    />
                    <Stop
                      offset="1"
                      stopColor={theme.colors.background.default}
                      stopOpacity="1"
                    />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="30"
                  fill="url(#fadeGradient)"
                />
              </Svg>
            </Box>
          )}
        </Box>

        {/* Expandable content */}
        {isExpanded && (
          <Box gap={12}>
            <KeyValueRow
              field={{
                label: (
                  <Box
                    flexDirection={FlexDirection.Row}
                    alignItems={AlignItems.center}
                    gap={4}
                  >
                    <TouchableOpacity
                      onPress={handleSlippagePress}
                      activeOpacity={0.6}
                      testID="edit-slippage-button"
                      style={styles.slippageButton}
                    >
                      <Text variant={TextVariant.BodyMDMedium}>
                        {strings('bridge.slippage')}
                      </Text>
                      <Icon
                        name={IconName.Edit}
                        size={IconSize.Sm}
                        color={IconColor.Muted}
                      />
                    </TouchableOpacity>
                  </Box>
                ),
                tooltip: {
                  title: strings('bridge.slippage_info_title'),
                  content: strings('bridge.slippage_info_description'),
                  size: TooltipSizes.Sm,
                },
              }}
              value={{
                label: {
                  text: slippage,
                  variant: TextVariant.BodyMD,
                },
              }}
            />

            {activeQuote?.minToTokenAmount && (
              <KeyValueRow
                field={{
                  label: {
                    text: strings('bridge.minimum_received'),
                    variant: TextVariant.BodyMDMedium,
                  },
                  tooltip: {
                    title: strings('bridge.minimum_received_tooltip_title'),
                    content: strings('bridge.minimum_received_tooltip_content'),
                    size: TooltipSizes.Sm,
                  },
                }}
                value={{
                  label: {
                    text: `${formattedMinToTokenAmount} ${destToken?.symbol}`,
                    variant: TextVariant.BodyMD,
                  },
                }}
              />
            )}

            {!isSameChainId && (
              <KeyValueRow
                field={{
                  label: {
                    text: strings('bridge.time'),
                    variant: TextVariant.BodyMDMedium,
                  },
                }}
                value={{
                  label: {
                    text: estimatedTime,
                    variant: TextVariant.BodyMD,
                  },
                }}
              />
            )}
          </Box>
        )}
      </Box>
      {hasFee ? (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.disclaimerText}
        >
          {strings('bridge.fee_disclaimer')}
        </Text>
      ) : null}
    </Box>
  );
};

export default QuoteDetailsCard;
