import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import KeyValueRow from '../../../../../../../component-library/components-temp/KeyValueRow';
import Routes from '../../../../../../../constants/navigation/Routes';
import type { EnrichedQuickBuyQuote } from '../useQuickBuyQuotes';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import QuickBuyQuoteCountdown from '../components/QuickBuyQuoteCountdown';
import type { Hex } from '@metamask/utils';

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

interface QuickBuyQuoteDetailsProps {
  activeQuote: EnrichedQuickBuyQuote | undefined;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  formattedNetworkFee: string;
  formattedSlippage: string;
  formattedMinimumReceived: string;
  formattedMinimumReceivedFiat: string | undefined;
  formattedRate: string | undefined;
  quotesLastFetchedAt: number | null;
  refreshCount: number;
  quoteRefreshRateMs: number;
  maxRefreshCount: number;
  refetchQuotes: () => void;
  onRatePress: () => void;
}

const QuickBuyQuoteDetails: React.FC<QuickBuyQuoteDetailsProps> = ({
  activeQuote,
  sourceToken,
  destToken,
  formattedNetworkFee,
  formattedSlippage,
  formattedMinimumReceived,
  formattedMinimumReceivedFiat,
  formattedRate,
  quotesLastFetchedAt,
  refreshCount,
  quoteRefreshRateMs,
  maxRefreshCount,
  refetchQuotes,
  onRatePress,
}) => {
  const navigation = useNavigation();
  const isRefreshExhausted = refreshCount >= maxRefreshCount;

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
    <Box twClassName="px-4 py-4" gap={6}>
      {/* Timer / refresh CTA row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {isRefreshExhausted ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={refetchQuotes}
            testID="quick-buy-get-new-quote"
          >
            {strings('social_leaderboard.quick_buy.get_new_quote')}
          </Button>
        ) : (
          <QuickBuyQuoteCountdown
            quotesLastFetchedAt={quotesLastFetchedAt}
            quoteRefreshRateMs={quoteRefreshRateMs}
          />
        )}
        {activeQuote?.quote?.bridgeId && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {activeQuote.quote.bridgeId}
          </Text>
        )}
      </Box>

      {/* Quote detail rows */}
      <Box twClassName="rounded-xl bg-muted overflow-hidden" gap={0}>
        {/* Rate row */}
        <TouchableOpacity onPress={onRatePress} testID="quick-buy-rate-row">
          <KeyValueRow
            style={styles.row}
            field={{
              label: {
                text: strings('social_leaderboard.quick_buy.rate'),
              },
            }}
            value={{
              label: (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
                    {formattedRate ?? '-'}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Xs}
                    color={IconColor.IconDefault}
                  />
                </Box>
              ),
            }}
          />
        </TouchableOpacity>

        {/* Network fee row */}
        <KeyValueRow
          style={styles.row}
          field={{
            label: {
              text: strings('social_leaderboard.quick_buy.network_fee'),
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
          style={styles.row}
          field={{
            label: {
              text: strings('social_leaderboard.quick_buy.slippage'),
            },
          }}
          value={{
            label: (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {formattedSlippage}
                </Text>
                <TouchableOpacity
                  onPress={handleEditSlippage}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="quick-buy-edit-slippage"
                >
                  <Icon
                    name={IconName.Edit}
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                  />
                </TouchableOpacity>
              </Box>
            ),
          }}
        />

        {/* Minimum received row */}
        <KeyValueRow
          style={styles.row}
          field={{
            label: {
              text: strings('social_leaderboard.quick_buy.minimum_received'),
            },
          }}
          value={{
            label: {
              text: minReceivedLabel,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default QuickBuyQuoteDetails;
