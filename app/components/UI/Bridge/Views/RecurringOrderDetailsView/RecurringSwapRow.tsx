import React from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
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

function getSwapTitleColor(swap: RecurringSwap) {
  if (swap.status === RecurringSwapStatus.Skipped) {
    return TextColor.TextAlternative;
  }

  if (swap.status === RecurringSwapStatus.Failed) {
    return TextColor.ErrorDefault;
  }

  return TextColor.TextDefault;
}

function getSkippedSwapLabel(swap: RecurringSwap) {
  if (!swap.skipReason) {
    return strings('bridge.recurring.failed');
  }

  return strings(`bridge.recurring.${swap.skipReason}`);
}

function getSwapSubtitle(swap: RecurringSwap) {
  if (swap.status === RecurringSwapStatus.Skipped) {
    return getSkippedSwapLabel(swap);
  }

  if (swap.status === RecurringSwapStatus.Submitted) {
    return strings('bridge.limit.submitted');
  }

  return '';
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
      subtitle={getSwapSubtitle(swap)}
      primaryValue={`+${destinationAmount} ${destinationToken.symbol}`}
      secondaryValue={`-${sourceAmount} ${sourceToken.symbol}`}
      titleColor={getSwapTitleColor(swap)}
      titleEndAccessory={
        isSkipped ? (
          <Icon
            name={IconName.Warning}
            color={IconColor.WarningDefault}
            size={IconSize.Sm}
          />
        ) : undefined
      }
      subtitleColor={
        isSkipped ? TextColor.WarningDefault : TextColor.TextAlternative
      }
      primaryColor={
        hasZeroAmounts ? TextColor.TextAlternative : TextColor.SuccessDefault
      }
      onPress={onPress}
      testID={RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(swap.id)}
    />
  );
}
