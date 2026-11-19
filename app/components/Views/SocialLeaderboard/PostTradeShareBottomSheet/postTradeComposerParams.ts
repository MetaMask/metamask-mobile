import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  SocialEvent,
  type SocialComposerEntry,
  type SocialEventSource,
} from '../analytics/socialEvents';
import type {
  SocialPostComposerViewParams,
  SocialPostPerpsPreview,
  SocialPostTradePreview,
} from '../SocialPostComposerView/SocialPostComposerView.types';

export const buildSpotPostTradeComposerParams = ({
  transactionHash,
  chain,
  preview,
  analyticsSource,
  spotComposerEntry = SocialEvent.ComposerEntry.POST_TRADE_SPOT,
  shareId,
}: {
  transactionHash: string;
  chain: string;
  preview: SocialPostTradePreview;
  analyticsSource?: SocialEventSource;
  spotComposerEntry?: Extract<
    SocialComposerEntry,
    'post_trade_spot' | 'post_trade_swap'
  >;
  shareId?: string;
}): SocialPostComposerViewParams => ({
  tradeInFlight: {
    transactionHash,
    chain,
    tokenAddress: preview.tokenAddress,
  },
  preview,
  spotComposerEntry,
  ...(analyticsSource ? { analyticsSource } : {}),
  ...(shareId ? { shareId } : {}),
});

export const buildPerpsPostTradeComposerParams = ({
  orderId,
  preview,
  analyticsSource,
  shareId,
}: {
  orderId: string;
  preview: SocialPostPerpsPreview;
  analyticsSource?: SocialEventSource;
  shareId?: string;
}): SocialPostComposerViewParams => ({
  tradeInFlight: {
    orderId,
    chain: 'hyperliquid',
    tokenAddress: preview.tokenAddress,
  },
  preview,
  ...(analyticsSource ? { analyticsSource } : {}),
  ...(shareId ? { shareId } : {}),
});

export const openPostTradeComposer = (
  params: SocialPostComposerViewParams,
): void => {
  NavigationService.navigation.navigate(Routes.SOCIAL.POST_COMPOSER, params);
};
