import React, { useMemo } from 'react';
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
} from '../../../../../core/redux/slices/bridge';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useRewards } from '../../hooks/useRewards';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import AddRewardsAccount from '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import QuoteCountdownTimer from '../QuoteCountdownTimer';
import QuoteDetailsRecipientKeyValueRow from '../QuoteDetailsRecipientKeyValueRow/QuoteDetailsRecipientKeyValueRow';
import { toSentenceCase } from '../../../../../util/string';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useLatestBalance } from '../../hooks/useLatestBalance';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QuoteDetailsCard: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = createStyles(theme);

  const locale = I18n.locale;
  const intlNumberFormatter = getIntlNumberFormatter(locale, {
    maximumSignificantDigits: 8,
  });

  const {
    formattedQuoteData,
    activeQuote,
    isLoading: isQuoteLoading,
    shouldShowPriceImpactWarning,
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

  const gasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
  });

  const insufficientBal = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const nativeTokenName = useMemo(() => {
    const chainId = sourceToken?.chainId;
    if (!chainId) return undefined;
    const native = getNativeSourceToken(chainId);
    return native?.symbol ?? sourceToken?.symbol ?? '';
  }, [sourceToken?.chainId, sourceToken?.symbol]);

  const isCurrentNetworkGasSponsored = useMemo(() => {
    if (!sourceToken?.chainId || !gasFeesSponsoredNetworkEnabled) {
      return false;
    }
    return gasFeesSponsoredNetworkEnabled(sourceToken.chainId);
  }, [sourceToken?.chainId, gasFeesSponsoredNetworkEnabled]);

  const shouldShowGasSponsored = useMemo(() => {
    const gasSponsored = activeQuote?.quote?.gasSponsored ?? false;
    return gasSponsored || (insufficientBal && isCurrentNetworkGasSponsored);
  }, [
    activeQuote?.quote?.gasSponsored,
    insufficientBal,
    isCurrentNetworkGasSponsored,
  ]);

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

  const gasIncluded = !!activeQuote?.quote.gasIncluded;
  const gasIncluded7702 = !!activeQuote?.quote.gasIncluded7702;
  const isGasless = gasIncluded7702 || gasIncluded;

  const formattedMinToTokenAmount = intlNumberFormatter.format(
    parseFloat(activeQuote?.minToTokenAmount?.amount || '0'),
  );

  return (
    <Box>
      <Box style={styles.container}>
        <KeyValueRow
          field={{
            label: (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('bridge.rate')}
                </Text>
                <QuoteCountdownTimer />
              </Box>
            ),
            tooltip: {
              title: strings('bridge.quote_info_title'),
              content: strings('bridge.quote_info_content'),
              size: TooltipSizes.Sm,
              iconName: IconName.Info,
            },
          }}
          value={{
            label: (
              <Text
                variant={TextVariant.BodyMD}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                color={TextColor.Alternative}
              >
                {rate}
              </Text>
            ),
          }}
        />
        {shouldShowGasSponsored ? (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.network_fee'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.network_fee_info_title'),
                content: strings('bridge.network_fee_info_content_sponsored', {
                  nativeToken: nativeTokenName,
                }),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: strings('bridge.gas_fees_sponsored'),
                variant: TextVariant.BodyMD,
              },
            }}
          />
        ) : isGasless ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {toSentenceCase(strings('bridge.network_fee'))}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text
                variant={TextVariant.BodyMD}
                style={styles.strikethroughText}
                color={TextColor.Alternative}
              >
                {networkFee}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('bridge.included')}
              </Text>
            </Box>
          </Box>
        ) : (
          <KeyValueRow
            field={{
              label: {
                text: toSentenceCase(strings('bridge.network_fee')),
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
              tooltip: {
                title: strings('bridge.network_fee_info_title'),
                content: strings('bridge.network_fee_info_content'),
                size: TooltipSizes.Sm,
                iconName: IconName.Info,
              },
            }}
            value={{
              label: {
                text: networkFee,
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
            }}
          />
        )}

        <KeyValueRow
          field={{
            label: {
              text: strings('bridge.slippage'),
              variant: TextVariant.BodyMD,
              color: TextColor.Alternative,
            },
            tooltip: {
              title: strings('bridge.slippage_info_title'),
              content: strings('bridge.slippage_info_description'),
              size: TooltipSizes.Sm,
              iconName: IconName.Info,
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
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {slippage}
                </Text>
                <Icon
                  name={IconName.Edit}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
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
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
              tooltip: {
                title: strings('bridge.minimum_received_tooltip_title'),
                content: strings('bridge.minimum_received_tooltip_content'),
                size: TooltipSizes.Sm,
                iconName: IconName.Info,
              },
            }}
            value={{
              label: {
                text: `${formattedMinToTokenAmount} ${destToken?.symbol}`,
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
            }}
          />
        )}

        {priceImpact && (
          <KeyValueRow
            field={{
              label: {
                text: toSentenceCase(strings('bridge.price_impact')),
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
              tooltip: {
                title: strings('bridge.price_impact_info_title'),
                content: isGasless
                  ? strings('bridge.price_impact_info_gasless_description')
                  : strings('bridge.price_impact_info_description'),
                size: TooltipSizes.Sm,
                iconName: IconName.Info,
              },
            }}
            value={{
              label: {
                text: priceImpact,
                variant: TextVariant.BodyMD,
                color: shouldShowPriceImpactWarning
                  ? TextColor.Error
                  : TextColor.Alternative,
              },
            }}
          />
        )}

        <QuoteDetailsRecipientKeyValueRow />

        {/* Estimated Points */}
        {shouldShowRewardsRow && (
          <Box testID="bridge-rewards-row">
            <KeyValueRow
              field={{
                label: {
                  text: toSentenceCase(strings('bridge.points')),
                  variant: TextVariant.BodyMD,
                },
                tooltip: {
                  title: strings('bridge.points_tooltip'),
                  content: `${strings(
                    'bridge.points_tooltip_content_1',
                  )}\n\n${strings('bridge.points_tooltip_content_2')}`,
                  size: TooltipSizes.Sm,
                  iconName: IconName.Info,
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
                    iconName: IconName.Info,
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
