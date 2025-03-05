import { useCallback, useEffect, useState } from 'react';
import { TokenI } from '../../../../Tokens/types';
import type { QuickAmount } from '../../../../Ramp/types';
import { EARN_ACTIONS } from '../../../constants';

interface UseEarnInputHandlersProps {
  token?: TokenI;
  action?: (typeof EARN_ACTIONS)[keyof typeof EARN_ACTIONS];
}

export const useEarnInputHandlers = ({
  token,
  action = EARN_ACTIONS.DEPOSIT,
}: UseEarnInputHandlersProps) => {
  const [selectedToken, setSelectedToken] = useState<TokenI | undefined>(token);
  const [inputAmount, setInputAmount] = useState('0');
  const [inputCurrency, setInputCurrency] = useState(token?.symbol || '');
  const [annualRewardRate] = useState('0');
  const [balanceValue] = useState('0');
  const [gasCostImpactWarning] = useState(false);
  const [currentAction] = useState(action);

  // Mock quick amounts for now - this should be calculated based on token balance
  const quickAmounts: QuickAmount[] = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: 'MAX' },
  ];

  const handleQuickAmountPress = useCallback(
    ({ value }: { value: number }) => {
      // TODO: Implement quick amount selection logic
      setInputAmount((value * parseFloat(balanceValue)).toString());
    },
    [balanceValue],
  );

  const handleCurrencySwitch = useCallback(() => {
    // TODO: Implement currency switching logic
  }, []);

  const handleKeypadPress = useCallback((value: string) => {
    setInputAmount(value);
  }, []);

  const handleReviewPress = useCallback(() => {
    // TODO: Implement review logic based on currentAction
  }, []);

  const handleTokenSelect = useCallback((newToken: TokenI) => {
    setSelectedToken(newToken);
    setInputCurrency(newToken.symbol);
  }, []);

  useEffect(() => {
    if (token && !selectedToken) {
      setSelectedToken(token);
      setInputCurrency(token.symbol);
    }
  }, [token, selectedToken]);

  return {
    selectedToken,
    inputAmount,
    inputCurrency,
    quickAmounts,
    handleQuickAmountPress,
    handleCurrencySwitch,
    handleKeypadPress,
    handleReviewPress,
    handleTokenSelect,
    gasCostImpactWarning,
    annualRewardRate,
    balanceValue,
    currentAction,
  };
};
