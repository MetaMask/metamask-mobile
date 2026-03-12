import React, { useMemo } from 'react';
import { TouchableOpacity, Platform, UIManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import createStyles from './QuoteDetailsCard.styles';
import { IconName as IconNameLegacy } from '../../../../../component-library/components/Icons/Icon';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
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
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { formatMinimumReceived } from '../../utils/currencyUtils';
import { useRewards } from '../../hooks/useRewards';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import AddRewardsAccount from '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import QuoteCountdownTimer from '../QuoteCountdownTimer';
import QuoteDetailsRecipientKeyValueRow from '../QuoteDetailsRecipientKeyValueRow/QuoteDetailsRecipientKeyValueRow';
import { toSentenceCase } from '../../../../../util/string';
import TagColored, {
  TagColor,
} from '../../../../../component-library/components-temp/TagColored';
import { useShouldRenderGasSponsoredBanner } from '../../hooks/useShouldRenderGasSponsoredBanner';
import { isGaslessQuote } from '../../utils/isGaslessQuote';
import { QuoteDetailsCardProps } from './QuoteDetailsCard.types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  TextVariant as TextVariantLegacy,
  TextColor as TextColorLegacy,
} from '../../../../../component-library/components/Texts/Text';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { PriceImpactModalType } from '../PriceImpactModal/constants';
import { formatPriceImpact } from '../../utils/formatPriceImpact';
import KeyValueRowLabel from '../../../../../component-library/components-temp/KeyValueRow/KeyValueLabel/KeyValueLabel';
import { usePriceImpactViewData } from '../../hooks/usePriceImpactViewData';
import AppConstants from '../../../../../core/AppConstants';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QuoteDetailsCard: React.FC<QuoteDetailsCardProps> = ({
  hasInsufficientBalance,
  location,
}) => {
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = createStyles(theme);

  const {
    formattedQuoteData,
    activeQuote,
    isLoading: isQuoteLoading,
  } = useBridgeQuoteData();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const {
    estimatedPoints,
    isLoading: isRewardsLoading,
    shouldShowRewardsRow,
    hasError: hasRewardsError,
    accountOptedIn,
    rewardsAccountScope,
  } = useRewards({
    activeQuote,
    isQuoteLoading,
  });

  const priceImpactIsSafe =
    !activeQuote?.quote.priceData?.priceImpact ||
    Number(activeQuote.quote.priceData.priceImpact) <=
      // @ts-expect-error TODO: remove comment after changes to core are published.
      (bridgeFeatureFlags?.priceImpactThreshold?.warning ??
        AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD);

  const nativeTokenName = useMemo(() => {
    const chainId = sourceToken?.chainId;
    if (!chainId) return undefined;
    const native = getNativeSourceToken(chainId);
    return native?.symbol ?? sourceToken?.symbol ?? '';
  }, [sourceToken?.chainId, sourceToken?.symbol]);

  const shouldShowGasSponsored = useShouldRenderGasSponsoredBanner({
    quoteGasSponsored: activeQuote?.quote?.gasSponsored ?? false,
    hasInsufficientBalance,
  });

  const handleSlippagePress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  };

  const handleRatePress = () => {
    navigation.navigate(Routes.BRIDGE.QUOTE_SELECTOR_VIEW);
  };

  const handlePriceImpactPress = () => {
    if (priceImpactIsSafe) {
      return;
    }

    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL,
      params: {
        type: PriceImpactModalType.Info,
        token: sourceToken,
        location,
      },
    });
  };

  const isGasless = isGaslessQuote(activeQuote?.quote);

  const formattedMinToTokenAmount = formatMinimumReceived(
    activeQuote?.minToTokenAmount?.amount || '0',
  );

  const priceImpactViewData = usePriceImpactViewData(
    activeQuote?.quote.priceData?.priceImpact,
  );

  // Early return for invalid states
  if (
    !sourceToken?.chainId ||
    !destToken?.chainId ||
    !sourceAmount ||
    !formattedQuoteData
  ) {
    return null;
  }

  return (
    <Box>
      <Box style={styles.container}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <KeyValueRowLabel
            label={
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('bridge.rate')}
                </Text>
                <QuoteCountdownTimer />
              </Box>
            }
            tooltip={{
              title: strings('bridge.quote_info_title'),
              content: strings('bridge.quote_info_content'),
              size: TooltipSizes.Sm,
              iconName: IconNameLegacy.Info,
            }}
          />
          <TouchableOpacity
            style={tw`flex-1 items-end`}
            onPress={handleRatePress}
            testID="rate-arrow-button"
            activeOpacity={0.6}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={tw`text-right`}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formattedQuoteData?.rate}
              </Text>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </Box>
          </TouchableOpacity>
        </Box>
        {shouldShowGasSponsored ? (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.network_fee'),
                variant: TextVariantLegacy.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.network_fee_info_title'),
                content: strings('bridge.network_fee_info_content_sponsored', {
                  nativeToken: nativeTokenName,
                }),
                size: TooltipSizes.Sm,
                iconName: IconNameLegacy.Info,
              },
            }}
            value={{
              label: (
                <TagColored
                  color={TagColor.Success}
                  labelProps={{
                    variant: TextVariantLegacy.BodySM,
                    style: {
                      textTransform: 'none',
                      textAlign: 'center',
                      bottom: 1,
                      fontWeight: 'normal',
                    },
                  }}
                >
                  {strings('bridge.gas_fees_sponsored')}
                </TagColored>
              ),
            }}
          />
        ) : isGasless ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {toSentenceCase(strings('bridge.network_fee'))}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={styles.strikethroughText}
              >
                {formattedQuoteData.networkFee}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('bridge.included')}
              </Text>
            </Box>
          </Box>
        ) : (
          <KeyValueRow
            field={{
              label: {
                text: toSentenceCase(strings('bridge.network_fee')),
                variant: TextVariantLegacy.BodyMD,
                color: TextColorLegacy.Alternative,
              },
              tooltip: {
                title: strings('bridge.network_fee_info_title'),
                content: strings('bridge.network_fee_info_content'),
                size: TooltipSizes.Sm,
                iconName: IconNameLegacy.Info,
              },
            }}
            value={{
              label: {
                text: formattedQuoteData.networkFee,
                variant: TextVariantLegacy.BodyMD,
                color: TextColorLegacy.Alternative,
              },
            }}
          />
        )}

        <KeyValueRow
          field={{
            label: {
              text: strings('bridge.slippage'),
              variant: TextVariantLegacy.BodyMD,
              color: TextColorLegacy.Alternative,
            },
            tooltip: {
              title: strings('bridge.slippage_info_title'),
              content: strings('bridge.slippage_info_description'),
              size: TooltipSizes.Sm,
              iconName: IconNameLegacy.Info,
            },
          }}
          value={{
            label: (
              <TouchableOpacity
                onPress={handleSlippagePress}
                activeOpacity={0.6}
                testID="edit-slippage-button"
                style={styles.slippageButton}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {formattedQuoteData.slippage}
                </Text>
                <Icon
                  name={IconName.Edit}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </TouchableOpacity>
            ),
          }}
        />

        {activeQuote?.minToTokenAmount && (
          <KeyValueRow
            field={{
              label: {
                text: toSentenceCase(strings('bridge.minimum_received')),
                variant: TextVariantLegacy.BodyMD,
                color: TextColorLegacy.Alternative,
              },
              tooltip: {
                title: strings('bridge.minimum_received_tooltip_title'),
                content: strings('bridge.minimum_received_tooltip_content'),
                size: TooltipSizes.Sm,
                iconName: IconNameLegacy.Info,
              },
            }}
            value={{
              label: {
                text: `${formattedMinToTokenAmount} ${destToken?.symbol}`,
                variant: TextVariantLegacy.BodyMD,
                color: TextColorLegacy.Alternative,
              },
            }}
          />
        )}

        <KeyValueRow
          field={{
            label: {
              text: toSentenceCase(strings('bridge.price_impact')),
              variant: TextVariantLegacy.BodyMD,
              color: TextColorLegacy.Alternative,
            },
            tooltip: {
              title: strings('bridge.price_impact_info_title'),
              content: strings('bridge.price_impact_info_description'),
              size: TooltipSizes.Sm,
              iconName: IconNameLegacy.Info,
            },
          }}
          value={{
            label: (
              <TouchableOpacity
                testID="price-impact-info-button"
                onPress={handlePriceImpactPress}
                activeOpacity={priceImpactIsSafe ? 1 : 0.6}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  {priceImpactViewData.icon && (
                    <Icon
                      name={priceImpactViewData.icon.name}
                      size={IconSize.Sm}
                      color={priceImpactViewData.icon.color}
                      twClassName="mt-[2px]"
                    />
                  )}
                  <Text
                    variant={TextVariant.BodyMd}
                    color={priceImpactViewData.textColor}
                  >
                    {formatPriceImpact(formattedQuoteData.priceImpact)}
                  </Text>
                </Box>
              </TouchableOpacity>
            ),
          }}
        />

        <QuoteDetailsRecipientKeyValueRow />

        {/* Estimated Points */}
        {shouldShowRewardsRow && (
          <Box testID="bridge-rewards-row">
            <KeyValueRow
              field={{
                label: {
                  text: toSentenceCase(strings('bridge.points')),
                  variant: TextVariantLegacy.BodyMD,
                },
                tooltip: {
                  title: strings('bridge.points_tooltip'),
                  content: `${strings(
                    'bridge.points_tooltip_content_1',
                  )}\n\n${strings('bridge.points_tooltip_content_2')}`,
                  size: TooltipSizes.Sm,
                  iconName: IconNameLegacy.Info,
                },
              }}
              value={{
                label: (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Center}
                    gap={1}
                  >
                    {accountOptedIn ? (
                      <RewardsAnimations
                        value={estimatedPoints ?? 0}
                        state={
                          isRewardsLoading
                            ? RewardAnimationState.Loading
                            : hasRewardsError
                              ? RewardAnimationState.ErrorState
                              : RewardAnimationState.Idle
                        }
                      />
                    ) : rewardsAccountScope ? (
                      <AddRewardsAccount
                        testID="bridge-add-rewards-account"
                        account={rewardsAccountScope}
                      />
                    ) : (
                      <></>
                    )}
                  </Box>
                ),
                ...(hasRewardsError && {
                  tooltip: {
                    title: strings('bridge.points_error'),
                    content: strings('bridge.points_error_content'),
                    size: TooltipSizes.Sm,
                    iconName: IconNameLegacy.Info,
                  },
                }),
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default QuoteDetailsCard;
