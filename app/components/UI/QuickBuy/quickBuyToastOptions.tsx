import React from 'react';
import {
  Box,
  BannerBaseActionButtonLayout,
  IconAlert,
  IconAlertSeverity,
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
  // Pin the action to the trailing edge; the design-system default stacks it
  // below the title and description. Drop the close X as well: with the X the
  // action, X and text compete for width and the text wraps into a narrow
  // column. Swipe and auto-dismiss still close the toast, and this matches the
  // Perps post-to-feed toast, which has no X.
  const actionButton = linkButtonOptions
    ? {
        actionButtonLabel: linkButtonOptions.label,
        actionButtonOnPress: linkButtonOptions.onPress,
        actionButtonLayout: BannerBaseActionButtonLayout.End,
        showCloseButton: false,
      }
    : {};

  switch (kind) {
    case 'complete':
      return {
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
        title,
        description,
        // The design-system toast top-aligns its content when the title wraps,
        // which pins the default check to the first line. Wrapping the check in
        // a self-centered box keeps it level with the middle of the text block.
        startAccessory: (
          <Box className="self-center">
            <IconAlert
              severity={IconAlertSeverity.Success}
              size={IconSize.Lg}
            />
          </Box>
        ),
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
