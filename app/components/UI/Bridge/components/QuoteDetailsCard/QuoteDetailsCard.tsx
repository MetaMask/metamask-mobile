import React, { useState, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
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
import { BadgeVariant } from '../../../../../component-library/components/Badges/Badge/Badge.types';
import Badge from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectSourceAmount,
  selectDestToken,
  selectSourceToken,
  selectIsEvmSolanaBridge,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import BigNumber from 'bignumber.js';

const ANIMATION_DURATION_MS = 50;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NetworkBadgeProps {
  chainId: string;
}

const NetworkBadge = ({ chainId }: NetworkBadgeProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const networkConfig = networkConfigurations[chainId];
  const displayName = networkConfig?.name || '';

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={2}
      style={styles.networkBadgeContainer}
    >
      <Badge
        variant={BadgeVariant.Network}
        imageSource={getNetworkImageSource({ chainId })}
        isScaled={false}
        size={AvatarSize.Sm}
      />
      <Text
        variant={TextVariant.BodyMDMedium}
        numberOfLines={1}
        style={styles.networkBadgeText}
      >
        {displayName}
      </Text>
    </Box>
  );
};

const QuoteDetailsCard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = createStyles(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const rotationValue = useSharedValue(0);

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

  const handleQuoteInfoPress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.QUOTE_INFO_MODAL);
  };

  const handleSlippagePress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.SLIPPAGE_MODAL);
  };

  const handlePriceImpactWarningPress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.PRICE_IMPACT_WARNING_MODAL, {
      isGasIncluded: !!activeQuote?.quote.gasIncluded,
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

  return (
    <Box>
      <Box style={styles.container}>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.spaceBetween}
        >
          {!isSameChainId && (
            <>
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                style={styles.networkContainer}
              >
                <NetworkBadge chainId={String(sourceToken.chainId)} />
                <Icon name={IconName.Arrow2Right} size={IconSize.Sm} />
                <NetworkBadge chainId={String(destToken.chainId)} />
              </Box>
              {isEvmSolanaBridge && (
                <Animated.View style={arrowStyle}>
                  <TouchableOpacity
                    onPress={toggleAccordion}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isExpanded
                        ? 'Collapse quote details'
                        : 'Expand quote details'
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
            </>
          )}
        </Box>

        {/* Always visible content */}
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
              <Text variant={TextVariant.BodyMD}>
                {strings('bridge.included')}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.strikethroughText}
              >
                {networkFee}
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
            }}
            value={{
              label: {
                text: networkFee,
                variant: TextVariant.BodyMD,
              },
            }}
          />
        )}

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

        {/* Quote info with gradient overlay */}
        <Box>
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.quote'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.quote_info_title'),
                content: strings('bridge.quote_info_content'),
                onPress: handleQuoteInfoPress,
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: rate,
                variant: TextVariant.BodyMD,
              },
            }}
          />
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
            {priceImpact && (
              <KeyValueRow
                field={{
                  label: {
                    text: strings('bridge.price_impact'),
                    variant: TextVariant.BodyMDMedium,
                  },
                  ...(shouldShowPriceImpactWarning && {
                    tooltip: {
                      title: strings('bridge.price_impact_warning_title'),
                      content: strings('bridge.price_impact_normal_warning'),
                      onPress: handlePriceImpactWarningPress,
                      size: TooltipSizes.Sm,
                    },
                  }),
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
              }}
              value={{
                label: {
                  text: slippage,
                  variant: TextVariant.BodyMD,
                },
              }}
            />
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
