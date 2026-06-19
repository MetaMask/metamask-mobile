import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  HeaderStandard,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import type { Trade } from '@metamask/social-controllers';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import { strings } from '../../../../../../../locales/i18n';
import {
  formatTokenAmount,
  formatTradeDate,
  formatUsd,
} from '../../../utils/formatters';
import { getTradeActionLabel } from '../../utils/getTradeActionLabel';
import PerpBadges from '../../../components/PerpBadges';
import { getPerpTradeDirection, isPerpTrade } from '../../../utils/perp';
import { chainNameToId } from '../../../utils/chainMapping';
import { toAssetId } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import useTransactionExplorer from '../../../../../UI/Rewards/hooks/useTransactionExplorer';
import { formatAddress } from '../../../../../../util/address';
import ClipboardManager from '../../../../../../core/ClipboardManager';
import { TraderTradeDetailBottomSheetSelectorsIDs } from './TraderTradeDetailBottomSheet.testIds';

export interface TraderTradeDetailBottomSheetProps {
  isVisible: boolean;
  trade: Trade | null;
  tokenSymbol: string;
  chain: string;
  tokenAddress: string;
  onClose: () => void;
}

interface DetailRowProps {
  label: string;
  value: string;
  valueClassName?: string;
  testID?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  valueClassName,
  testID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="py-3"
    testID={testID}
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      twClassName={valueClassName}
      numberOfLines={1}
    >
      {value}
    </Text>
  </Box>
);

const TraderTradeDetailBottomSheet: React.FC<
  TraderTradeDetailBottomSheetProps
> = ({ isVisible, trade, tokenSymbol, chain, tokenAddress, onClose }) => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const caipAssetId = useMemo((): CaipAssetType | undefined => {
    const caipChainId = chainNameToId(chain);
    if (!caipChainId) return undefined;
    return toAssetId(tokenAddress, caipChainId) ?? undefined;
  }, [chain, tokenAddress]);

  const explorer = useTransactionExplorer(
    caipAssetId,
    trade?.transactionHash,
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleSheetClosed = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onClose]);

  const handleCopyTxHash = useCallback(async () => {
    if (!trade?.transactionHash) return;
    await ClipboardManager.setString(trade.transactionHash);
  }, [trade?.transactionHash]);

  const handleViewOnExplorer = useCallback(() => {
    if (!explorer?.url) return;
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: explorer.url,
      },
    });
  }, [explorer?.url, navigation]);

  if (!isVisible || !trade) {
    return null;
  }

  const isEntry = trade.intent === 'enter';
  const isPerp = isPerpTrade(trade);
  const perpDirection = getPerpTradeDirection(trade);
  const actionLabel = getTradeActionLabel(trade);
  const usdDisplay = formatUsd(
    isEntry ? Math.abs(trade.usdCost) : -Math.abs(trade.usdCost),
  );
  const tokenAmountDisplay = `${formatTokenAmount(trade.tokenAmount)} ${tokenSymbol}`;
  const showExplorer = !isPerp && Boolean(explorer?.url);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      isInteractable
      onClose={handleSheetClosed}
      testID={TraderTradeDetailBottomSheetSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('social_leaderboard.trader_position.trade_detail_title')}
        titleProps={{
          variant: TextVariant.HeadingSm,
          fontWeight: FontWeight.Bold,
        }}
        onClose={handleClose}
        closeButtonProps={{
          testID: TraderTradeDetailBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />

      <Box twClassName="px-4 pb-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="mb-1"
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {actionLabel}
          </Text>
          {perpDirection ? (
            <PerpBadges
              direction={perpDirection}
              leverage={trade.perpLeverage}
              testID="trader-trade-detail-perp-badges"
            />
          ) : null}
        </Box>

        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          twClassName={
            isEntry ? 'text-success-default' : 'text-error-default'
          }
        >
          {usdDisplay}
        </Text>

        <Box twClassName="h-px bg-muted my-2" />

        <DetailRow
          label={strings('social_leaderboard.trader_position.trade_detail_date')}
          value={formatTradeDate(trade.timestamp)}
        />
        <DetailRow
          label={strings(
            'social_leaderboard.trader_position.trade_detail_amount',
          )}
          value={tokenAmountDisplay}
        />
        <DetailRow
          label={strings(
            'social_leaderboard.trader_position.trade_detail_token',
          )}
          value={tokenSymbol}
        />

        <TouchableOpacity
          onPress={handleCopyTxHash}
          accessibilityRole="button"
          testID={TraderTradeDetailBottomSheetSelectorsIDs.COPY_TX_HASH_BUTTON}
        >
          <DetailRow
            label={strings(
              'social_leaderboard.trader_position.trade_detail_tx_hash',
            )}
            value={formatAddress(trade.transactionHash, 'short')}
          />
        </TouchableOpacity>

        {showExplorer ? (
          <Box twClassName="mt-4">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleViewOnExplorer}
              testID={TraderTradeDetailBottomSheetSelectorsIDs.EXPLORER_BUTTON}
            >
              {strings('perps.transactions.view_on_explorer')}
            </Button>
          </Box>
        ) : null}
      </Box>
    </BottomSheet>
  );
};

export default TraderTradeDetailBottomSheet;
