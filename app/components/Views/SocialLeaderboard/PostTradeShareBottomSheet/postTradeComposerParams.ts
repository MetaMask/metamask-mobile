import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type { SocialEventSource } from '../analytics/socialEvents';
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
}: {
  transactionHash: string;
  chain: string;
  preview: SocialPostTradePreview;
  analyticsSource?: SocialEventSource;
}): SocialPostComposerViewParams => ({
  tradeInFlight: {
    transactionHash,
    chain,
    tokenAddress: preview.tokenAddress,
  },
  preview,
  ...(analyticsSource ? { analyticsSource } : {}),
});

export const buildPerpsPostTradeComposerParams = ({
  orderId,
  preview,
  analyticsSource,
}: {
  orderId: string;
  preview: SocialPostPerpsPreview;
  analyticsSource?: SocialEventSource;
}): SocialPostComposerViewParams => ({
  tradeInFlight: {
    orderId,
    chain: 'hyperliquid',
    tokenAddress: preview.tokenAddress,
  },
  preview,
  ...(analyticsSource ? { analyticsSource } : {}),
});

export const openPostTradeComposer = (
  params: SocialPostComposerViewParams,
): void => {
  NavigationService.navigation.navigate(Routes.SOCIAL.POST_COMPOSER, params);
};
