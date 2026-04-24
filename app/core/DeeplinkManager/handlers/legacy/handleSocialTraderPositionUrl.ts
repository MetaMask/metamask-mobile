import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

interface HandleSocialTraderPositionUrlParams {
  actionPath: string;
}

/**
 * Handler for social-trader-position deeplink.
 *
 * Navigation tiers:
 * 1. traderId + tokenAddress + chain + tokenSymbol → Routes.SOCIAL_LEADERBOARD.POSITION
 * 2. traderId only (position params missing)       → Routes.SOCIAL_LEADERBOARD.PROFILE
 * 3. no traderId                                   → Routes.SOCIAL_LEADERBOARD.VIEW
 *
 * Supported URL formats:
 * - https://link.metamask.io/social-trader-position?traderId=X&tokenAddress=Y&chain=Z&tokenSymbol=W
 * - metamask://social-trader-position?traderId=X&tokenAddress=Y&chain=Z&tokenSymbol=W
 */
export function handleSocialTraderPositionUrl({
  actionPath,
}: HandleSocialTraderPositionUrlParams) {
  DevLogger.log('[handleSocialTraderPositionUrl] Starting deeplink handling');

  try {
    const state = ReduxService.store.getState();
    const isEnabled = selectSocialLeaderboardEnabled(state);

    if (!isEnabled) {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
      return;
    }

    const queryString = actionPath.includes('?')
      ? actionPath.split('?')[1]
      : actionPath;
    const urlParams = new URLSearchParams(queryString);

    const traderId = urlParams.get('traderId') ?? undefined;
    const tokenAddress = urlParams.get('tokenAddress') ?? undefined;
    const chain = urlParams.get('chain') ?? undefined;
    const tokenSymbol = urlParams.get('tokenSymbol') ?? undefined;
    const traderName = urlParams.get('traderName') ?? undefined;
    // positionContext has no matching field in the Position type; logged for debugging only
    const positionContext = urlParams.get('positionContext') ?? undefined;

    DevLogger.log('[handleSocialTraderPositionUrl] Parsed params:', {
      traderId,
      tokenAddress,
      chain,
      tokenSymbol,
      traderName,
      positionContext,
    });

    if (traderId && tokenAddress && chain && tokenSymbol) {
      NavigationService.navigation.navigate(
        Routes.SOCIAL_LEADERBOARD.POSITION,
        {
          traderId,
          traderName: traderName ?? '',
          tokenSymbol,
          position: {
            tokenAddress,
            chain,
            tokenSymbol,
            tokenName: tokenSymbol,
            positionAmount: 0,
            boughtUsd: 0,
            soldUsd: 0,
            realizedPnl: 0,
            costBasis: 0,
            trades: [],
            lastTradeAt: 0,
          },
        },
      );
      return;
    }

    if (traderId) {
      NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName: traderName ?? '',
      });
      return;
    }

    NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
  } catch (error) {
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
      error,
    );
    Logger.error(
      error as Error,
      '[handleSocialTraderPositionUrl] Error handling social-trader-position deeplink',
    );
    try {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleSocialTraderPositionUrl] Failed to navigate to fallback screen',
      );
    }
  }
}
