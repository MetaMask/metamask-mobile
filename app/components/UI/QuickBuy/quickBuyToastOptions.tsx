import React from 'react';
import {
  IconColor,
  IconSize,
  Spinner,
  ToastSeverity,
  type ToastOptions,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import type { TrackedQuickBuyTrade } from './quickBuyTradeTracker';

export type QuickBuyToastKind = 'pending' | 'complete' | 'failed';

/** Action rendered on the complete toast, such as Post to feed. */
export interface QuickBuyToastLinkButtonOptions {
  label: string;
  onPress: () => void;
}

interface BuildQuickBuyToastParams {
  trade: TrackedQuickBuyTrade;
  /** Only rendered on the complete toast. */
  linkButtonOptions?: QuickBuyToastLinkButtonOptions;
}

/**
 * Pure builder for the QuickBuy swap-lifecycle toasts. Renders an action title
 * (line 1) plus the exchange-rate quote as a description (line 2), matching the
 * Swap design. Shared by the controller (pending / synchronous failure) and the
 * global status handler (complete / failure) so the toasts stay consistent.
 */
export function buildQuickBuyToastOptions(
  kind: QuickBuyToastKind,
  { trade, linkButtonOptions }: BuildQuickBuyToastParams,
): ToastOptions {
  const title = strings(
    `social_leaderboard.quick_buy.toast_${kind}_${trade.tradeMode}`,
    {
      amount: trade.fiatAmountLabel,
      symbol: trade.tokenSymbol,
      counter: trade.counterTokenSymbol,
    },
  );

  const description = trade.rate || undefined;
  const actionButton = linkButtonOptions
    ? {
        actionButtonLabel: linkButtonOptions.label,
        actionButtonOnPress: linkButtonOptions.onPress,
      }
    : {};

  switch (kind) {
    case 'complete':
      return {
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
        title,
        description,
        ...actionButton,
      };
    case 'failed':
      return {
        severity: ToastSeverity.Danger,
        hasNoTimeout: false,
        title,
        description,
      };
    case 'pending':
    default:
      return {
        hasNoTimeout: false,
        title,
        description,
        startAccessory: (
          <Spinner
            color={IconColor.IconDefault}
            spinnerIconProps={{ size: IconSize.Lg }}
          />
        ),
      };
  }
}
