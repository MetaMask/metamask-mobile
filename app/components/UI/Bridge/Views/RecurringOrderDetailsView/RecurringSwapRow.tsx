import React from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import OpenOrderRow from '../../components/OpenOrderRow';
import {
  type RecurringSwap,
  RecurringSwapStatus,
} from '../../api/recurringOrders.types';
import type { BridgeToken } from '../../types';
import { formatRecurringTokenAmount } from '../../utils/recurringOrders';
import { RecurringOrderDetailsViewSelectorsIDs } from './RecurringOrderDetailsView.testIds';

interface RecurringSwapRowProps {
  swap: RecurringSwap;
  sourceToken: BridgeToken;
  destinationToken: BridgeToken;
  onPress: () => void;
}

function getSwapAccessory(swap: RecurringSwap) {
  if (swap.status === RecurringSwapStatus.Skipped) {
    return (
      <Icon
        name={IconName.Warning}
        color={IconColor.WarningDefault}
        size={IconSize.Sm}
      />
    );
  }

  if (swap.status === RecurringSwapStatus.Failed) {
    return (
      <Tag severity={TagSeverity.Danger}>
        {strings('bridge.recurring.failed')}
      </Tag>
    );
  }

  return (
    <Tag severity={TagSeverity.Success}>
      {strings('bridge.recurring.filled')}
    </Tag>
  );
}

function getSkippedSwapLabel(swap: RecurringSwap) {
  if (!swap.skipReason) {
    return strings('bridge.recurring.failed');
  }

  return strings(`bridge.recurring.${swap.skipReason}`);
}

export function RecurringSwapRow({
  swap,
  sourceToken,
  destinationToken,
  onPress,
}: RecurringSwapRowProps) {
  const isSkipped = swap.status === RecurringSwapStatus.Skipped;
  const hasZeroAmounts = swap.status !== RecurringSwapStatus.Filled;
  const sourceAmount = formatRecurringTokenAmount(
    hasZeroAmounts ? '0' : swap.src.amount,
    sourceToken.decimals,
  );
  const destinationAmount = formatRecurringTokenAmount(
    hasZeroAmounts ? '0' : swap.dest.amount,
    destinationToken.decimals,
  );

  return (
    <OpenOrderRow
      token={destinationToken}
      title={strings('bridge.recurring.pair', {
        source: sourceToken.symbol,
        dest: destinationToken.symbol,
      })}
      subtitle={isSkipped ? getSkippedSwapLabel(swap) : ''}
      primaryValue={`+${destinationAmount} ${destinationToken.symbol}`}
      secondaryValue={`-${sourceAmount} ${sourceToken.symbol}`}
      titleColor={isSkipped ? TextColor.WarningDefault : TextColor.TextDefault}
      subtitleColor={
        isSkipped ? TextColor.WarningDefault : TextColor.TextAlternative
      }
      primaryColor={
        hasZeroAmounts ? TextColor.TextAlternative : TextColor.SuccessDefault
      }
      titleEndAccessory={getSwapAccessory(swap)}
      onPress={onPress}
      testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(swap.swapId)}
    />
  );
}
