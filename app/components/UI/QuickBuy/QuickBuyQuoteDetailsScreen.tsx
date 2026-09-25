import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  AvatarToken,
  AvatarTokenSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
import { useQuickBuyContext } from './useQuickBuyContext';
import { getGaslessFeeAsset } from '../Bridge/utils/getGaslessFeeAsset';
import { DiscountType } from '@metamask/bridge-controller';
import RewardsVipBadge from '../Rewards/components/RewardsVipBadge';
import { RewardsDiscountBadge } from '../Rewards/components/RewardsDiscountBadge';
import QuickBuySubScreenHeader from './components/QuickBuySubScreenHeader';
import QuickBuyQuoteCountdown from './components/QuickBuyQuoteCountdown';
import {
  QuickBuyQuoteDetailPressableValue,
  QuickBuyQuoteDetailRow,
  QuickBuyQuoteDetailTextValue,
} from './components/QuickBuyQuoteDetailRow';

const QuickBuyQuoteDetailsScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    sourceToken,
    destToken,
    activeQuote,
    hasValidAmount,
    formattedNetworkFee,
    formattedSlippage,
    formattedMinimumReceivedFiat,
    formattedRate,
    formattedPriceImpact,
    isPriceImpactError,
    isBlockingQuoteLoad,
    isGasless,
    discountBadge,
    baseFeePercentage,
    metamaskFeePercent,
    quotesLastFetchedAt,
    quoteRefreshRateMs,
    onClose,
    setActiveScreen,
  } = useQuickBuyContext();

  // No quote to detail yet: show an actionable empty state instead of a table
  // of dashes. The rate pill is reachable pre-quote (it shows an estimate), so
  // tapping it must not land the user on an empty details screen.
  const hasQuoteDetails = Boolean(activeQuote);

  const handleEditSlippage = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  };

  const minReceivedLabel = formattedMinimumReceivedFiat
    ? `~${formattedMinimumReceivedFiat}`
    : '-';
  // Same fee-token chip as Bridge's gasless quote details: only gasless
  // quotes pay the fee in a token, so only they get a chip.
  const gaslessFeeAsset = isGasless
    ? getGaslessFeeAsset(activeQuote?.quote?.feeData?.txFee)
    : undefined;

  return (
    <>
      <QuickBuySubScreenHeader
        title={strings('social_leaderboard.quick_buy.quote_details_title')}
        onBack={() => setActiveScreen('amount')}
        onClose={onClose}
      />

      {isBlockingQuoteLoad ? (
        <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.quick_buy.loading')}
          </Text>
        </Box>
      ) : !hasQuoteDetails ? (
        <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings(
              hasValidAmount
                ? 'social_leaderboard.quick_buy.quote_details_empty_no_quote'
                : 'social_leaderboard.quick_buy.quote_details_empty_no_amount',
            )}
          </Text>
        </Box>
      ) : (
        <Box twClassName="px-4 pt-3" gap={2}>
          <QuickBuyQuoteDetailRow
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
                  {strings('social_leaderboard.quick_buy.rate')}
                </Text>
                <QuickBuyQuoteCountdown
                  quotesLastFetchedAt={quotesLastFetchedAt}
                  quoteRefreshRateMs={quoteRefreshRateMs}
                />
              </Box>
            }
            tooltipTitle={strings('bridge.quote_info_title')}
            tooltipContent={strings('bridge.quote_info_content')}
            value={
              <QuickBuyQuoteDetailPressableValue
                onPress={() => setActiveScreen('selectQuote')}
                testID={QuickBuySheetSelectorsIDs.RATE_ROW}
                text={formattedRate ?? '-'}
                iconName={IconName.ArrowRight}
              />
            }
          />

          <QuickBuyQuoteDetailRow
            label={strings('social_leaderboard.quick_buy.slippage')}
            tooltipTitle={strings('bridge.slippage_info_title')}
            tooltipContent={strings('bridge.slippage_info_description')}
            value={
              <QuickBuyQuoteDetailPressableValue
                onPress={handleEditSlippage}
                testID={QuickBuySheetSelectorsIDs.EDIT_SLIPPAGE}
                text={formattedSlippage}
                iconName={IconName.Edit}
              />
            }
          />

          <Box twClassName="h-px w-full bg-border-muted" />

          <QuickBuyQuoteDetailRow
            label={strings('social_leaderboard.quick_buy.network_fee')}
            tooltipTitle={strings('bridge.network_fee_info_title')}
            tooltipContent={strings('bridge.network_fee_info_content')}
            value={
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {formattedNetworkFee}
                </Text>
                {gaslessFeeAsset ? (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={1}
                    twClassName="rounded-md bg-muted px-1.5"
                  >
                    <AvatarToken
                      name={gaslessFeeAsset.symbol}
                      src={
                        gaslessFeeAsset.iconUrl
                          ? { uri: gaslessFeeAsset.iconUrl }
                          : undefined
                      }
                      size={AvatarTokenSize.Xs}
                    />
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                    >
                      {gaslessFeeAsset.symbol}
                    </Text>
                  </Box>
                ) : null}
              </Box>
            }
          />

          <QuickBuyQuoteDetailRow
            label={strings('social_leaderboard.quick_buy.metamask_fee')}
            tooltipTitle={strings('social_leaderboard.quick_buy.metamask_fee')}
            tooltipContent={strings('bridge.fee_disclaimer', {
              feePercentage: metamaskFeePercent,
            })}
            value={
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                {discountBadge?.type === DiscountType.VIP ? (
                  <RewardsVipBadge />
                ) : null}
                {discountBadge && discountBadge.type !== DiscountType.VIP ? (
                  <RewardsDiscountBadge label={discountBadge.label ?? ''} />
                ) : null}
                {baseFeePercentage ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="line-through"
                  >
                    {baseFeePercentage}
                  </Text>
                ) : null}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {`${metamaskFeePercent}%`}
                </Text>
              </Box>
            }
          />

          <Box twClassName="h-px w-full bg-border-muted" />

          {isPriceImpactError && (
            <QuickBuyQuoteDetailRow
              label={strings('bridge.price_impact_info_title')}
              tooltipTitle={strings('bridge.price_impact_info_title')}
              tooltipContent={strings('bridge.price_impact_info_description')}
              value={
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <Icon
                    name={IconName.Warning}
                    size={IconSize.Sm}
                    color={IconColor.ErrorDefault}
                  />
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.ErrorDefault}
                  >
                    {formattedPriceImpact}
                  </Text>
                </Box>
              }
            />
          )}

          <QuickBuyQuoteDetailRow
            label={strings('social_leaderboard.quick_buy.minimum_received')}
            tooltipTitle={strings('bridge.minimum_received_tooltip_title')}
            tooltipContent={strings('bridge.minimum_received_tooltip_content')}
            value={<QuickBuyQuoteDetailTextValue text={minReceivedLabel} />}
          />
        </Box>
      )}
    </>
  );
};

export default QuickBuyQuoteDetailsScreen;
