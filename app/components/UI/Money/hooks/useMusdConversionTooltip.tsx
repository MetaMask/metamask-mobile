import React, { useCallback, useState } from 'react';
import { MUSD_CONVERSION_APY } from '../../Earn/constants/musd';
import { strings } from '../../../../../locales/i18n';
import { TooltipModal } from '../../../Views/confirmations/components/UI/Tooltip/Tooltip';

interface MusdConversionTooltipModalProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  tooltipTestId: string;
}

export function MusdConversionTooltipModal({
  open,
  setOpen,
  tooltipTestId,
}: MusdConversionTooltipModalProps) {
  return (
    <TooltipModal
      open={open}
      setOpen={setOpen}
      title={strings('money.deposit_tooltip_title')}
      content={strings('money.deposit_tooltip_description', {
        percentage: MUSD_CONVERSION_APY,
      })}
      tooltipTestId={tooltipTestId}
    />
  );
}

/**
 * Shared mUSD conversion tooltip. Owns the open/close state and renders the
 * single-sourced tooltip modal so the Money Account deposit navbar and the
 * Ramp BuildQuote screen present the same content.
 */
export function useMusdConversionTooltip(tooltipTestId: string) {
  const [open, setOpen] = useState(false);

  const onInfoPress = useCallback(() => setOpen(true), []);

  const TooltipNode = (
    <MusdConversionTooltipModal
      open={open}
      setOpen={setOpen}
      tooltipTestId={tooltipTestId}
    />
  );

  return { TooltipNode, onInfoPress };
}
