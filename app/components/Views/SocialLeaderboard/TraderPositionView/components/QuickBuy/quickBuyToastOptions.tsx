import React from 'react';
import {
  IconColor as DsIconColor,
  IconSize as DsIconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  ButtonIconVariant,
  ToastVariants,
  type ToastOptions,
} from '../../../../../../component-library/components/Toast/Toast.types';
import ToastService from '../../../../../../core/ToastService';
import { strings } from '../../../../../../../locales/i18n';
import type { Theme } from '../../../../../../util/theme/models';
import type { TrackedQuickBuyTrade } from './quickBuyTradeTracker';

export type QuickBuyToastKind = 'pending' | 'complete' | 'failed';

interface BuildQuickBuyToastParams {
  trade: TrackedQuickBuyTrade;
  theme: Theme;
}

const closeButtonOptions = {
  variant: ButtonIconVariant.Icon as const,
  iconName: IconName.Close,
  onPress: () => ToastService.toastRef?.current?.closeToast(),
};

/**
 * Pure builder for the QuickBuy swap-lifecycle toasts. Renders an action title
 * (line 1) plus the exchange-rate quote as a description (line 2), matching the
 * Swap design. Shared by the controller (pending / synchronous failure) and the
 * global status handler (complete / failure) so the toasts stay consistent.
 */
export function buildQuickBuyToastOptions(
  kind: QuickBuyToastKind,
  { trade, theme }: BuildQuickBuyToastParams,
): ToastOptions {
  const title = strings(
    `social_leaderboard.quick_buy.toast_${kind}_${trade.tradeMode}`,
    {
      amount: trade.fiatAmountLabel,
      symbol: trade.tokenSymbol,
      counter: trade.counterTokenSymbol,
    },
  );

  const descriptionOptions = trade.rate
    ? { description: trade.rate }
    : undefined;

  switch (kind) {
    case 'complete':
      return {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
        labelOptions: [{ label: title, isBold: true }],
        descriptionOptions,
        closeButtonOptions,
      };
    case 'failed':
      return {
        variant: ToastVariants.Icon,
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
        labelOptions: [{ label: title, isBold: true }],
        descriptionOptions,
        closeButtonOptions,
      };
    case 'pending':
    default:
      return {
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hasNoTimeout: false,
        labelOptions: [{ label: title, isBold: true }],
        descriptionOptions,
        closeButtonOptions,
        startAccessory: (
          <Spinner
            color={DsIconColor.IconDefault}
            spinnerIconProps={{ size: DsIconSize.Lg }}
          />
        ),
      };
  }
}
