import { useCallback } from 'react';
import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { useABTest } from '../../../../../hooks';
import Engine from '../../../../../core/Engine';
import {
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
} from './abTestConfig';

export const useTrackInputAmountChange = () => {
  const { variantName, isActive } = useABTest(
    NUMPAD_QUICK_ACTIONS_AB_KEY,
    NUMPAD_QUICK_ACTIONS_VARIANTS,
  );

  return useCallback(
    ({ inputValue, preset }: { inputValue: string; preset?: string }) => {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.InputChanged,
        {
          input: 'token_amount_source',
          input_value: inputValue,
          ...(preset && { input_amount_preset: preset }),
          ...(isActive && {
            active_ab_tests: [
              {
                key: NUMPAD_QUICK_ACTIONS_AB_KEY,
                value: variantName,
              },
            ],
          }),
        },
      );
    },
    [isActive, variantName],
  );
};
