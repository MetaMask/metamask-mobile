import Routes from '../../../../constants/navigation/Routes';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

interface HandleTrendingUrlParams {
  actionPath: string;
}

const isStocksPath = (actionPath: string): boolean => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return urlParams.get('screen')?.toLowerCase() === 'stocks';
};

export const createTrendingDeeplinkIntent = ({
  actionPath,
}: HandleTrendingUrlParams): DeeplinkIntent => {
  // Explore -> Stocks Deeplink: the RWA tokens view is a MainNavigator stack
  // screen above the tabs, so it is a main-stack target.
  if (isStocksPath(actionPath)) {
    return {
      target: {
        type: 'main-stack',
        routeName: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
        // Back from the RWA full view should return to the Explore tab, not
        // Wallet — matching the previous two-step warm navigation behavior.
        backTab: Routes.TRENDING_VIEW,
      },
    };
  }

  // Explore Deeplink: the Explore (Trending) tab inside HOME_TABS.
  return {
    target: {
      type: 'home-tab',
      routeName: Routes.TRENDING_VIEW,
    },
  };
};

export async function handleTrendingUrl({
  actionPath,
}: HandleTrendingUrlParams) {
  await executeDeeplinkIntent(createTrendingDeeplinkIntent({ actionPath }));
}
