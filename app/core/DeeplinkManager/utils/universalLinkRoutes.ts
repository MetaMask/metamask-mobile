import { ACTIONS } from '../../../constants/deeplinks';
import { createRouteRegistry } from './createRouteRegistry';

export const SUPPORTED_ACTIONS = {
  DAPP: ACTIONS.DAPP,
  BUY: ACTIONS.BUY,
  BUY_CRYPTO: ACTIONS.BUY_CRYPTO,
  SELL: ACTIONS.SELL,
  SELL_CRYPTO: ACTIONS.SELL_CRYPTO,
  HOME: ACTIONS.HOME,
  ASSET: ACTIONS.ASSET,
  SWAP: ACTIONS.SWAP,
  BATCH_SELL: ACTIONS.BATCH_SELL,
  SEND: ACTIONS.SEND,
  CREATE_ACCOUNT: ACTIONS.CREATE_ACCOUNT,
  PERPS: ACTIONS.PERPS,
  PERPS_MARKETS: ACTIONS.PERPS_MARKETS,
  PERPS_ASSET: ACTIONS.PERPS_ASSET,
  PERPS_OUTREACH: ACTIONS.PERPS_OUTREACH,
  REWARDS: ACTIONS.REWARDS,
  PREDICT: ACTIONS.PREDICT,
  WC: ACTIONS.WC,
  ONBOARDING: ACTIONS.ONBOARDING,
  CARD_ONBOARDING: ACTIONS.CARD_ONBOARDING,
  CARD_HOME: ACTIONS.CARD_HOME,
  CARD_KYC_NOTIFICATION: ACTIONS.CARD_KYC_NOTIFICATION,
  TRENDING: ACTIONS.TRENDING,
  WHATS_HAPPENING: ACTIONS.WHATS_HAPPENING,
  TOP_TRADERS: ACTIONS.TOP_TRADERS,
  SOCIAL: ACTIONS.SOCIAL,
  SOCIAL_TRADER: ACTIONS.SOCIAL_TRADER,
  SOCIAL_TRADER_POSITION: ACTIONS.SOCIAL_TRADER_POSITION,
  SHIELD: ACTIONS.SHIELD,
  EARN_MUSD: ACTIONS.EARN_MUSD,
  NFT: ACTIONS.NFT,
  AGENTIC_CLI: ACTIONS.AGENTIC_CLI,
  ON_RAMP: ACTIONS.ON_RAMP,
  PRIVACY: ACTIONS.PRIVACY,
  NOTIFICATIONS_SETTINGS: ACTIONS.NOTIFICATIONS_SETTINGS,
  MONEY_ACCOUNT_DEPOSIT: ACTIONS.MONEY_ACCOUNT_DEPOSIT,
  ANDROID_SDK: ACTIONS.ANDROID_SDK,
  CONNECT: ACTIONS.CONNECT,
  MMSDK: ACTIONS.MMSDK,
  MONEY: ACTIONS.MONEY,
} as const;

export type SupportedAction =
  (typeof SUPPORTED_ACTIONS)[keyof typeof SUPPORTED_ACTIONS];

export interface UniversalLinkRoute {
  pathname: string;
  action: SupportedAction;
  acceptsPathPayload?: boolean;
}

const PATH_PAYLOAD_ACTIONS: readonly SupportedAction[] = [
  ACTIONS.DAPP,
  ACTIONS.SEND,
];

export const UNIVERSAL_LINK_ROUTES: readonly UniversalLinkRoute[] = [
  ...Object.values(SUPPORTED_ACTIONS).map((action) => ({
    pathname: `/${action}`,
    action,
    acceptsPathPayload: PATH_PAYLOAD_ACTIONS.includes(action),
  })),
  { pathname: '/social/profile', action: ACTIONS.SOCIAL },
  { pathname: '/social/profile/position', action: ACTIONS.SOCIAL },
  { pathname: '/social/post', action: ACTIONS.SOCIAL },
  { pathname: '/on-ramp/return', action: ACTIONS.ON_RAMP },
];

const registry = createRouteRegistry<UniversalLinkRoute>();
UNIVERSAL_LINK_ROUTES.forEach(registry.addRoute);

export function matchUniversalLinkRoute(
  pathname: string,
): UniversalLinkRoute | undefined {
  const route = registry.matchRoute(pathname);
  if (route) {
    return route;
  }

  const actionRoute = registry.matchRoute(`/${pathname.split('/')[1]}`);
  return actionRoute?.acceptsPathPayload ? actionRoute : undefined;
}
