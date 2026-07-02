import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import type { LinkFlowOrigin } from './useMoneyAccountCardLinkage';
import { CardEntryPoint } from '../util/metrics';

export const MONEY_HOME_CARD_ORIGIN: LinkFlowOrigin = {
  screen: Routes.HOME_TABS,
  params: {
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  },
};

export const CASHBACK_MONEY_ACCOUNT_ORIGIN: LinkFlowOrigin = {
  screen: Routes.CARD.CASHBACK,
  entrypoint: CardEntryPoint.CASHBACK,
};

export const CREDIT_MONEY_ACCOUNT_ORIGIN: LinkFlowOrigin = {
  screen: Routes.CARD.CREDIT_REDEEM,
  entrypoint: CardEntryPoint.CREDIT,
};

const isLinkFlowOrigin = (value: unknown): value is LinkFlowOrigin =>
  typeof value === 'object' &&
  value !== null &&
  'screen' in value &&
  typeof (value as LinkFlowOrigin).screen === 'string';

/**
 * Reads `postAuthRedirect` from the current card navigation stack when set by a
 * Money account entry point. Returns undefined for direct card opens.
 */
export const useCardPostAuthRedirect = (): LinkFlowOrigin | undefined => {
  const navigation = useNavigation();

  return useMemo(() => {
    let parent = navigation.getParent();

    while (parent) {
      const state = parent.getState();
      for (const route of state.routes) {
        const redirect = (route.params as { postAuthRedirect?: unknown })
          ?.postAuthRedirect;
        if (isLinkFlowOrigin(redirect)) {
          return redirect;
        }

        const nestedParams = route.params as
          | { params?: { postAuthRedirect?: unknown } }
          | undefined;
        const nestedRedirect = nestedParams?.params?.postAuthRedirect;
        if (isLinkFlowOrigin(nestedRedirect)) {
          return nestedRedirect;
        }
      }

      parent = parent.getParent();
    }

    return undefined;
  }, [navigation]);
};
