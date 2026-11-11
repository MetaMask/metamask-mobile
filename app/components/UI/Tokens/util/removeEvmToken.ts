import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../../util/analytics/AnalyticsEventBuilder';
import { TokenI } from '../types';
import NotificationManager from '../../../../core/NotificationManager';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';

interface RemoveEvmTokenProps {
  tokenToRemove: TokenI;
  currentChainId: string;
  trackEvent: (event: AnalyticsTrackingEvent) => void;
  strings: (key: string, args?: Record<string, unknown>) => string;
  getDecimalChainId: (chainId: string) => number;
  createEventBuilder: typeof AnalyticsEventBuilder.createEventBuilder;
}

/**
 * Fires the "token hidden" notification and analytics event for an EVM
 * token removal. Actually hiding the asset is handled separately by
 * `useAssetVisibility().handleHideToken`, which calls `AssetsController`.
 */
export const removeEvmToken = async ({
  tokenToRemove,
  currentChainId,
  trackEvent,
  strings,
  getDecimalChainId,
  createEventBuilder,
}: RemoveEvmTokenProps) => {
  const tokenAddress = tokenToRemove?.address || '';
  const symbol = tokenToRemove?.symbol || '';

  try {
    NotificationManager.showSimpleNotification({
      status: `simple_notification`,
      duration: 5000,
      title: strings('wallet.token_toast.token_hidden_title'),
      description: strings('wallet.token_toast.token_hidden_desc', {
        tokenSymbol: symbol,
      }),
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
        .addProperties({
          location: 'assets_list',
          token_standard: 'ERC20',
          asset_type: 'token',
          tokens: [`${symbol} - ${tokenAddress}`],
          chain_id: getDecimalChainId(currentChainId),
        })
        .build(),
    );
  } catch (err) {
    Logger.log(err, 'Wallet: Failed to hide token!');
  }
};
