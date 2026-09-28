import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** Quick-sell fractions of the held Position, floored to whole contracts. */
const QUICK_CONTRACT_FRACTIONS = [
  { key: 'quarter', label: '25%', fraction: 0.25 },
  { key: 'half', label: '50%', fraction: 0.5 },
] as const;

interface OrderQuickContractsProps {
  /** The whole-contract position size the chips are bounded by. */
  maxContracts: number;
  /** Sets the entered contract count to the pressed chip's floored count. */
  onSetContracts: (contracts: number) => void;
  /** Disables chips while a quote is being submitted. */
  isDisabled?: boolean;
}

/**
 * The quick-sell chips beneath the contract entry: 25% and 50% of the held
 * Position, floored to whole contracts, plus Max for the full position.
 * Unlike the buy chips these set (not add to) the entered count.
 */
export const OrderQuickContracts = ({
  maxContracts,
  onSetContracts,
  isDisabled = false,
}: OrderQuickContractsProps) => (
  <Box twClassName="flex-row gap-2">
    {QUICK_CONTRACT_FRACTIONS.map(({ key, label, fraction }) => (
      <Button
        key={key}
        testID={PredictOrderFlowTestIds.QUICK_CONTRACT(key)}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isDisabled={isDisabled}
        onPress={() => onSetContracts(Math.floor(maxContracts * fraction))}
        twClassName="h-11 flex-1 min-w-0 rounded-xl"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {label}
        </Text>
      </Button>
    ))}
    <Button
      testID={PredictOrderFlowTestIds.QUICK_CONTRACT('max')}
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      isDisabled={isDisabled}
      onPress={() => onSetContracts(maxContracts)}
      twClassName="h-11 flex-1 min-w-0 rounded-xl"
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('predict_next.order_preview.max')}
      </Text>
    </Button>
  </Box>
);
