import React from 'react';
import { TouchableOpacity, Platform, UIManager } from 'react-native';
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
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectDestToken,
  selectSourceToken,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useRewards } from '../../hooks/useRewards';
import { useRewardsIconAnimation } from '../../hooks/useRewardsIconAnimation';
import Rive, { Alignment, Fit } from 'rive-react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const RewardsIconAnimation = require('../../../../../animations/rewards_icon_animations.riv');

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

  const locale = I18n.locale;
  const intlNumberFormatter = getIntlNumberFormatter(locale, {
    maximumFractionDigits: 3,
  });

  const {
    formattedQuoteData,
    activeQuote,
    isLoading: isQuoteLoading,
  } = useBridgeQuoteData();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const {
    estimatedPoints,
    isLoading: isRewardsLoading,
    shouldShowRewardsRow,
    hasError: hasRewardsError,
  } = useRewards({
    activeQuote,
    isQuoteLoading,
  });

  // Use custom hook for Rive animation logic
  const { riveRef } = useRewardsIconAnimation({
    isRewardsLoading,
    estimatedPoints,
    hasRewardsError,
    shouldShowRewardsRow,
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

  const { networkFee, rate, priceImpact, slippage } = formattedQuoteData;

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

  const formattedMinToTokenAmount = intlNumberFormatter.format(
    parseFloat(activeQuote?.minToTokenAmount?.amount || '0'),
  );

  return (
    <Box>
      <Box style={styles.container}>
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
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text variant={TextVariant.BodyMDMedium}>
              {strings('bridge.network_fee')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
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

        <KeyValueRow
          field={{
            label: (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
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

        {/* Estimated Points */}
        {shouldShowRewardsRow && (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.points'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.points_tooltip'),
                content: strings('bridge.points_tooltip_content'),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                >
                  <Rive
                    ref={riveRef}
                    source={RewardsIconAnimation}
                    fit={Fit.FitHeight}
                    alignment={Alignment.CenterRight}
                  />
                  {!isRewardsLoading && (
                    <Text variant={TextVariant.BodyMD}>
                      {hasRewardsError
                        ? strings('bridge.unable_to_load')
                        : estimatedPoints?.toString() ?? ''}
                    </Text>
                  )}
                </Box>
              ),
              ...(hasRewardsError && {
                tooltip: {
                  title: strings('bridge.points_error'),
                  content: strings('bridge.points_error_content'),
                  size: TooltipSizes.Sm,
                },
              }),
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default QuoteDetailsCard;
