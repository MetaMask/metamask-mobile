import React, { useCallback, useMemo } from 'react';
import { QuickPickButtonOption } from '../SwapsKeypad/types';
import { QuickPickButtons } from '../SwapsKeypad/QuickPickButtons';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BridgeToken } from '../../types';
import { BigNumber } from 'bignumber.js';
import { useABTest } from '../../../../../hooks';
import { getDecimalChainId } from '../../../../../util/networks';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import Engine from '../../../../../core/Engine';
import {
  InputAmountPreset,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { PERCENTAGE_TO_PRESET } from './constants';
import {
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
  NumpadQuickAction,
  NumpadQuickActionsVariant,
} from './abTestConfig';

interface GaslessQuickPickOptionsProps {
  token?: BridgeToken;
  onMaxPress: () => void;
  onChange: (data: KeypadChangeData) => void;
  isQuoteSponsored?: boolean;
}

export const GaslessQuickPickOptions = ({
  onChange,
  onMaxPress,
  token,
  isQuoteSponsored,
}: GaslessQuickPickOptionsProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const tokenBalance = useLatestBalance({
    address: token?.address,
    decimals: token?.decimals,
    chainId: token?.chainId,
  });
  const { variant, variantName, isActive } = useABTest(
    NUMPAD_QUICK_ACTIONS_AB_KEY,
    NUMPAD_QUICK_ACTIONS_VARIANTS,
  );

  const selectedVariant = variantName as NumpadQuickActionsVariant;

  const trackQuickActionClick = useCallback(
    ({
      quickActionLabel,
      quickActionValue,
      isMax,
    }: {
      quickActionLabel: string;
      quickActionValue: number;
      isMax: boolean;
    }) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_INPUT_QUICK_AMOUNT_CLICKED)
          .addProperties({
            location: 'swap_input_view',
            quick_action_label: quickActionLabel,
            quick_action_value: quickActionValue,
            is_max: isMax,
            chain_id_source: getDecimalChainId(token?.chainId),
            token_symbol_source: token?.symbol,
            token_address_source: token?.address,
            user_token_balance: tokenBalance?.displayBalance,
            ...(isActive && {
              active_ab_tests: [
                {
                  key: NUMPAD_QUICK_ACTIONS_AB_KEY,
                  value: variantName,
                },
              ],
            }),
          })
          .build(),
      );
    },
    [
      createEventBuilder,
      isActive,
      token?.address,
      token?.chainId,
      token?.symbol,
      tokenBalance?.displayBalance,
      trackEvent,
      variantName,
    ],
  );

  const trackInputAmountPreset = useCallback((preset: InputAmountPreset) => {
    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      UnifiedSwapBridgeEventName.InputChanged,
      {
        input: 'token_amount_source',
        input_value: '',
        input_amount_preset: preset,
      },
    );
  }, []);

  const onQuickOptionPress = useCallback(
    (percentage: number) => () => {
      if (!tokenBalance?.displayBalance) return '0';

      const balance = new BigNumber(tokenBalance.displayBalance);
      const amount = balance
        .multipliedBy(percentage / 100)
        .decimalPlaces(token?.decimals ?? 18, BigNumber.ROUND_DOWN);

      onChange({
        value: amount.toString(),
        valueAsNumber: Number(amount),
        pressedKey: Keys.Initial,
      });

      trackQuickActionClick({
        quickActionLabel: `${percentage}%`,
        quickActionValue: percentage / 100,
        isMax: false,
      });

      const preset =
        PERCENTAGE_TO_PRESET[percentage as keyof typeof PERCENTAGE_TO_PRESET];
      if (preset) {
        trackInputAmountPreset(preset);
      }
    },
    [
      tokenBalance,
      token?.decimals,
      onChange,
      trackQuickActionClick,
      trackInputAmountPreset,
    ],
  );

  const handleTrackedMaxPress = useCallback(() => {
    onMaxPress();
    trackQuickActionClick({
      quickActionLabel: 'MAX',
      quickActionValue: 1,
      isMax: true,
    });
    trackInputAmountPreset(InputAmountPreset.MAX);
  }, [onMaxPress, trackInputAmountPreset, trackQuickActionClick]);

  const fallbackQuickActions = useMemo(
    (): number[] =>
      selectedVariant === 'treatment' ? [50, 75, 85, 95] : [25, 50, 75, 90],
    [selectedVariant],
  );

  const maxAllowedQuickActions = variant as readonly NumpadQuickAction[];

  const shouldRenderMaxOption = useShouldRenderMaxOption(
    token,
    tokenBalance?.displayBalance,
    isQuoteSponsored,
  );

  const quickActions = useMemo(
    (): readonly NumpadQuickAction[] | number[] =>
      shouldRenderMaxOption ? maxAllowedQuickActions : fallbackQuickActions,
    [fallbackQuickActions, maxAllowedQuickActions, shouldRenderMaxOption],
  );

  const quickPickOptions = useMemo(
    () =>
      quickActions.map((action) => {
        if (action === 'MAX') {
          return {
            label: 'Max',
            onPress: handleTrackedMaxPress,
          };
        }

        return {
          label: `${action}%`,
          onPress: onQuickOptionPress(action),
        };
      }) satisfies QuickPickButtonOption[],
    [handleTrackedMaxPress, onQuickOptionPress, quickActions],
  );

  return <QuickPickButtons options={quickPickOptions} show />;
};
