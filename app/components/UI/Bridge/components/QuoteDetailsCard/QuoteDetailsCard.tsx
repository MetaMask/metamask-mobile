import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
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
import mockQuotes from '../../_mocks_/mock-quotes-native-erc20.json';
import { QuoteResponse } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSlippage,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';

// Enable Layout Animation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const ANIMATION_DURATION_MS = 300;

interface NetworkBadgeProps {
  chainId: string;
}

const NetworkBadge = ({ chainId }: NetworkBadgeProps) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const networkConfig = networkConfigurations[chainId];
  const displayName = networkConfig?.name || '';

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={2}
    >
      <Badge
        variant={BadgeVariant.Network}
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        imageSource={getNetworkImageSource({ chainId })}
        isScaled={false}
        size={AvatarSize.Sm}
      />
      <Text variant={TextVariant.BodyMDMedium}>{displayName}</Text>
    </Box>
  );
};

// Using first quote from mock data
const quoteDetails = mockQuotes[0] as unknown as QuoteResponse; //TODO: Remove this once we have a real quote from the controller MMS-1886

const QuoteDetailsCard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = createStyles(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const rotationValue = useSharedValue(0);

  const slippage = useSelector(selectSlippage);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

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
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.QUOTE_INFO_MODAL,
    });
  };

  const handleSlippagePress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SLIPPAGE_MODAL,
    });
  };

  if (!quoteDetails || !sourceToken?.chainId || !destToken?.chainId) {
    return null;
  }

  const isSameChainId = sourceToken.chainId === destToken.chainId;

  const { quote, estimatedProcessingTimeInSeconds } = quoteDetails;

  // Format the data for display
  const quoteData = {
    networkFee: '$0.01', // TODO: Calculate from quote.feeData
    estimatedTime: `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`,
    rate: `1 ${sourceToken.symbol} = ${(
      Number(quote.destTokenAmount) / Number(quote.srcTokenAmount)
    ).toFixed(1)} ${destToken.symbol}`,
    priceImpact: '-0.06%', // TODO: Calculate from quote data
    slippage: `${slippage}%`, // TODO: Get from bridge settings
    srcChainId: sourceToken.chainId,
    destChainId: destToken.chainId,
  };

  return (
    <Box style={styles.container}>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.spaceBetween}
      >
        {!isSameChainId ? (
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            style={styles.networkContainer}
          >
            <NetworkBadge chainId={quoteData.srcChainId} />
            <Icon name={IconName.Arrow2Right} size={IconSize.Sm} />
            <NetworkBadge chainId={quoteData.destChainId} />
          </Box>
        ) : (
          <Box>
            <></>
          </Box>
        )}
        <Box>
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
        </Box>
      </Box>

      {/* Always visible content */}
      <KeyValueRow
        field={{
          label: {
            text: strings('bridge.network_fee') || 'Network fee',
            variant: TextVariant.BodyMDMedium,
          },
        }}
        value={{
          label: {
            text: quoteData.networkFee,
            variant: TextVariant.BodyMD,
          },
        }}
      />

      <KeyValueRow
        field={{
          label: {
            text: strings('bridge.time') || 'Time',
            variant: TextVariant.BodyMDMedium,
          },
        }}
        value={{
          label: {
            text: quoteData.estimatedTime,
            variant: TextVariant.BodyMD,
          },
        }}
      />

      {/* Quote info with gradient overlay */}
      <Box>
        <KeyValueRow
          field={{
            label: {
              text: strings('bridge.quote') || 'Quote',
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
            label: { text: quoteData.rate, variant: TextVariant.BodyMD },
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
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.price_impact') || 'Price Impact',
                variant: TextVariant.BodyMDMedium,
              },
            }}
            value={{
              label: {
                text: quoteData.priceImpact,
                variant: TextVariant.BodyMD,
              },
            }}
          />

          <KeyValueRow
            field={{
              label: (
                <Box
                  flexDirection={FlexDirection.Row}
                  alignItems={AlignItems.center}
                  gap={4}
                >
                  <Text variant={TextVariant.BodyMDMedium}>
                    {strings('bridge.slippage') || 'Slippage'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleSlippagePress}
                    activeOpacity={0.6}
                    testID="edit-slippage-button"
                  >
                    <Icon
                      name={IconName.Edit}
                      size={IconSize.Xs}
                      color={IconColor.Muted}
                    />
                  </TouchableOpacity>
                </Box>
              ),
            }}
            value={{
              label: {
                text: quoteData.slippage,
                variant: TextVariant.BodyMD,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default QuoteDetailsCard;
