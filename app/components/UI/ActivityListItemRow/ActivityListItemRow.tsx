/**
 * Row component that renders a single ActivityListItem from the shared adapter shape.
 * All styling and localization are Mobile-specific; data comes from the shared adapters.
 */
import React, { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { getNetworkImageSource } from '../../../util/networks';
import { RootState } from '../../../reducers';
import { AppThemeKey } from '../../../util/theme/models';
import type { ActivityKind } from '../../../util/activity-adapters';
import { createStyles } from './ActivityListItemRow.styles';
import { ActivityListItemRowIcon } from './ActivityListItemRowIcon';
import { ActivityListItemRowLayout } from './ActivityListItemRowLayout';
import { useActivityListItemRowContent } from './useActivityListItemRowContent';
import type { ActivityListItemRowProps } from './ActivityListItemRow.types';

export { resolveActivityListItemTitle } from './useActivityListItemRowContent';

function resolveIconType(type: ActivityKind): string {
  switch (type) {
    case 'send':
    case 'sell':
    case 'lendingDeposit':
    case 'deposit':
    case 'wrap':
    case 'perpsAddFunds':
    case 'predictionsAddFunds':
      return 'send';
    case 'receive':
    case 'buy':
    case 'claim':
    case 'claimMusdBonus':
    case 'lendingWithdrawal':
    case 'unwrap':
    case 'nftMint':
    case 'perpsWithdrawFunds':
    case 'predictionsWithdrawFunds':
    case 'predictionClaimWinnings':
    case 'predictionCashedOut':
    case 'predictionPlaced':
    case 'perpsReceivedFundingFees':
      return 'receive';
    case 'swap':
    case 'swapIncomplete':
    case 'bridge':
    case 'convert':
      return 'swap';
    case 'approveSpendingCap':
    case 'revokeSpendingCap':
    case 'increaseSpendingCap':
    case 'contractInteraction':
    case 'contractDeployment':
    case 'smartAccountUpgrade':
    case 'perpsOpenLong':
    case 'perpsCloseLong':
    case 'perpsCloseLongLiquidated':
    case 'perpsCloseLongStopLoss':
    case 'perpsOpenShort':
    case 'perpsCloseShort':
    case 'perpsCloseShortLiquidated':
    case 'perpsCloseShortStopLoss':
    case 'perpsPaidFundingFees':
    case 'perpsCloseShortTakeProfit':
    case 'perpsCloseLongTakeProfit':
    case 'marketShort':
    case 'stopMarketCloseShort':
    case 'marketCloseShort':
      return 'interaction';
  }
}

export function ActivityListItemRow({
  bridgeHistoryItem,
  item,
  index,
  onPress,
  title: titleOverride,
}: ActivityListItemRowProps) {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector(
    (state: RootState) => state.user.appTheme as AppThemeKey,
  );
  const content = useActivityListItemRowContent(
    item,
    undefined,
    bridgeHistoryItem,
  );
  const styles = createStyles(colors, typography);
  const isFailed = item.status === 'failed' || item.status === 'cancelled';
  const icon = getTransactionIcon(
    resolveIconType(item.type),
    isFailed,
    appTheme,
    osColorScheme,
  );
  const networkImageSource = getNetworkImageSource({
    chainId: item.chainId,
  });

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  return (
    <ActivityListItemRowLayout
      avatar={
        <ActivityListItemRowIcon
          fallbackIcon={icon}
          networkImageSource={networkImageSource}
          styles={styles}
          tokens={content.avatarTokens}
        />
      }
      index={index}
      isFailed={isFailed}
      item={item}
      onPress={handlePress}
      primaryAmount={content.primaryAmount}
      primaryToken={content.primaryToken}
      secondaryAmount={content.secondaryAmount}
      styles={styles}
      subtitle={content.subtitle}
      title={titleOverride ?? content.title}
    />
  );
}

export default ActivityListItemRow;
