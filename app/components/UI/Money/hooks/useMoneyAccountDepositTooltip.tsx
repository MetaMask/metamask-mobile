import React, { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { TooltipModal } from '../../../Views/confirmations/components/UI/Tooltip/Tooltip';
import useMoneyAccountBalance from './useMoneyAccountBalance';

interface MoneyAccountDepositTooltipModalProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  tooltipTestId: string;
}

export function MoneyAccountDepositTooltipModal({
  open,
  setOpen,
  tooltipTestId,
}: MoneyAccountDepositTooltipModalProps) {
  const { apyPercent } = useMoneyAccountBalance();
  const percentage = apyPercent ?? 0;

  return (
    <TooltipModal
      open={open}
      setOpen={setOpen}
      title={strings('money.deposit_tooltip_title', { percentage })}
      content={strings('money.deposit_tooltip_description', { percentage })}
      tooltipTestId={tooltipTestId}
    />
  );
}

export function useMoneyAccountDepositTooltip(tooltipTestId: string) {
  const [open, setOpen] = useState(false);

  const onInfoPress = useCallback(() => setOpen(true), []);

  const TooltipNode = (
    <MoneyAccountDepositTooltipModal
      open={open}
      setOpen={setOpen}
      tooltipTestId={tooltipTestId}
    />
  );

  return { TooltipNode, onInfoPress };
}
