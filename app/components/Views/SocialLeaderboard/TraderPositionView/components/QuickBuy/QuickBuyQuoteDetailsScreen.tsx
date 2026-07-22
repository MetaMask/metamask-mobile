import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { strings } from '../../../../../../../locales/i18n';
import {
  KeyValueRowStubs,
  KeyValueRowSectionAlignments,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import { IconName as IconNameLegacy } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import { useQuickBuyContext } from './useQuickBuyContext';
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
    formattedMinimumReceived,
    formattedMinimumReceivedFiat,
    formattedRate,
    formattedPriceImpact,
    isPriceImpactError,
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
    ? `${formattedMinimumReceived} ~${formattedMinimumReceivedFiat}`
    : formattedMinimumReceived;

  return (
    <>
      <QuickBuySubScreenHeader
        title={strings('social_leaderboard.quick_buy.quote_details_title')}
        onBack={() => setActiveScreen('amount')}
        onClose={onClose}
      />

      {!hasQuoteDetails ? (
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
        <Box twClassName="px-4 pt-3" gap={3}>
          <KeyValueRowStubs.Root>
            <KeyValueRowStubs.Section>
              <KeyValueRowStubs.Label
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
                tooltip={{
                  title: strings('bridge.quote_info_title'),
                  content: strings('bridge.quote_info_content'),
                  iconName: IconNameLegacy.Info,
                }}
              />
            </KeyValueRowStubs.Section>
            <KeyValueRowStubs.Section
              align={KeyValueRowSectionAlignments.RIGHT}
            >
              <QuickBuyQuoteDetailPressableValue
                onPress={() => setActiveScreen('selectQuote')}
                testID="quick-buy-rate-row"
                text={formattedRate ?? '-'}
                iconName={IconName.ArrowRight}
              />
            </KeyValueRowStubs.Section>
          </KeyValueRowStubs.Root>

          <QuickBuyQuoteDetailRow
            label={strings('social_leaderboard.quick_buy.network_fee')}
            tooltipTitle={strings('bridge.network_fee_info_title')}
            tooltipContent={strings('bridge.network_fee_info_content')}
            value={<QuickBuyQuoteDetailTextValue text={formattedNetworkFee} />}
          />

          <QuickBuyQuoteDetailRow
            label={strings('social_leaderboard.quick_buy.slippage')}
            tooltipTitle={strings('bridge.slippage_info_title')}
            tooltipContent={strings('bridge.slippage_info_description')}
            value={
              <QuickBuyQuoteDetailPressableValue
                onPress={handleEditSlippage}
                testID="quick-buy-edit-slippage"
                text={formattedSlippage}
                iconName={IconName.Edit}
              />
            }
          />

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
