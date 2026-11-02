import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type {
  SocialPostComposerViewParams,
  SocialPostPerpsPreview,
  SocialPostTradePreview,
} from '../SocialPostComposerView/SocialPostComposerView.types';

export const buildSpotPostTradeComposerParams = ({
  transactionHash,
  chain,
  preview,
}: {
  transactionHash: string;
  chain: string;
  preview: SocialPostTradePreview;
}): SocialPostComposerViewParams => ({
  tradeInFlight: {
    transactionHash,
    chain,
    tokenAddress: preview.tokenAddress,
  },
  preview,
});

export const buildPerpsPostTradeComposerParams = ({
  orderId,
  preview,
}: {
  orderId: string;
  preview: SocialPostPerpsPreview;
}): SocialPostComposerViewParams => ({
  tradeInFlight: {
    orderId,
    chain: 'hyperliquid',
    tokenAddress: preview.tokenAddress,
  },
  preview,
});

export const openPostTradeComposer = (
  params: SocialPostComposerViewParams,
): void => {
  NavigationService.navigation.navigate(Routes.SOCIAL.POST_COMPOSER, params);
};
