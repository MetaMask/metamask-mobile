import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import images from 'images/image-icons';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface KeyValueRowProps {
  label: string;
  /** Renders the info affordance next to the label when provided. */
  onInfoPress?: () => void;
  children: React.ReactNode;
}

/** A "Pay with"/"Total"-style row: dotted-underlined key, value on the right. */
const KeyValueRow = ({ label, onInfoPress, children }: KeyValueRowProps) => (
  <Box twClassName="flex-row items-center justify-between gap-4 py-2">
    <Box twClassName="self-start">
      <Box twClassName="flex-row items-center gap-1">
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {label}
        </Text>
        {onInfoPress ? (
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={PredictOrderFlowTestIds.TOTAL_INFO}
            accessible
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </TouchableOpacity>
        ) : null}
      </Box>
      <Box twClassName="h-0 w-full border-b border-dashed border-muted" />
    </Box>
    <Box twClassName="min-w-0 flex-row items-center gap-2">{children}</Box>
  </Box>
);

interface OrderSummaryRowsProps {
  /** The formatted Predict balance backing the order, when loaded. */
  balance?: string;
  /** The formatted total debit: the quoted value, or the entered amount. */
  total: string;
  /** Whether a quote exists for the info affordance to break down. */
  canShowBreakdown: boolean;
  onBreakdownPress: () => void;
}

/**
 * The Pay with and Total rows beneath the amount. Pay with is a static
 * Predict-balance display for now; Total carries the 'i' that opens the
 * breakdown sheet.
 */
export const OrderSummaryRows = ({
  balance,
  total,
  canShowBreakdown,
  onBreakdownPress,
}: OrderSummaryRowsProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-2">
      <KeyValueRow label={strings('predict_next.order_preview.pay_with')}>
        {/* TODO(PRED): Take the currency icon and label from the backend
         * balance payload (pUSD for Polymarket, base USDC for Kalshi)
         * instead of this hardcoded USDC placeholder. */}
        <Image source={images.USDC} style={tw.style('h-4 w-4')} />
        {/* TODO(PRED): Make this row the payment-method selector once
         * "pay with any token" (PWAT) support lands. */}
        <Text
          variant={TextVariant.BodySm}
          testID={PredictOrderFlowTestIds.PAY_WITH}
        >
          {strings('predict_next.order_preview.predict_balance')}
          {balance ? ` ($${balance})` : ''}
        </Text>
      </KeyValueRow>
      <KeyValueRow
        label={strings('predict_next.order_preview.total')}
        onInfoPress={canShowBreakdown ? onBreakdownPress : undefined}
      >
        <Text
          variant={TextVariant.BodySm}
          testID={PredictOrderFlowTestIds.TOTAL}
        >
          {total}
        </Text>
      </KeyValueRow>
    </Box>
  );
};
