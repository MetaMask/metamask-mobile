import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import { IconName as IconNameLegacy } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import type { Hex } from '@metamask/utils';
import { useQuickBuyContext } from './useQuickBuyContext';
import QuickBuySubScreenHeader from './components/QuickBuySubScreenHeader';
import QuickBuyQuoteCountdown from './components/QuickBuyQuoteCountdown';

const QuickBuyQuoteDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    sourceToken,
    destToken,
    formattedNetworkFee,
    formattedSlippage,
    formattedMinimumReceived,
    formattedMinimumReceivedFiat,
    formattedRate,
    quotesLastFetchedAt,
    quoteRefreshRateMs,
    onClose,
    setActiveScreen,
  } = useQuickBuyContext();

  const sourceChainId = sourceToken?.chainId
    ? (`0x${Number(sourceToken.chainId).toString(16)}` as Hex)
    : undefined;
  const destChainId = destToken?.chainId
    ? (`0x${Number(destToken.chainId).toString(16)}` as Hex)
    : undefined;

  const handleEditSlippage = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: { sourceChainId, destChainId },
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

      <Box twClassName="px-4 pt-3 pb-4" gap={3}>
        {/* Rate row — countdown inline with label, value opens Select Quote */}
        <KeyValueRow
          field={{
            label: (
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
            ),
            tooltip: {
              title: strings('bridge.quote_info_title'),
              content: strings('bridge.quote_info_content'),
              size: TooltipSizes.Sm,
              iconName: IconNameLegacy.Info,
            },
          }}
          value={{
            label: (
              <TouchableOpacity
                onPress={() => setActiveScreen('selectQuote')}
                testID="quick-buy-rate-row"
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
                  >
                    {formattedRate ?? '-'}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </TouchableOpacity>
            ),
          }}
        />

        {/* Network fee row */}
        <KeyValueRow
          field={{
            label: {
              text: strings('social_leaderboard.quick_buy.network_fee'),
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
              text: formattedNetworkFee,
            },
          }}
        />

        {/* Slippage row */}
        <KeyValueRow
          field={{
            label: {
              text: strings('social_leaderboard.quick_buy.slippage'),
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
                onPress={handleEditSlippage}
                activeOpacity={0.6}
                testID="quick-buy-edit-slippage"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {formattedSlippage}
                  </Text>
                  <Icon
                    name={IconName.Edit}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </TouchableOpacity>
            ),
          }}
        />

        {/* Minimum received row */}
        <KeyValueRow
          field={{
            label: {
              text: strings('social_leaderboard.quick_buy.minimum_received'),
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
              text: minReceivedLabel,
            },
          }}
        />
      </Box>
    </>
  );
};

export default QuickBuyQuoteDetailsScreen;
