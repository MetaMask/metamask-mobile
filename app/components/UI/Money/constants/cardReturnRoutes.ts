import Routes from '../../../../constants/navigation/Routes';
import type { MoneyCardReturnScreen } from '../types/navigation';

export const CARD_RETURN_ROUTES = {
  authentication: Routes.CARD.AUTHENTICATION,
  onboarding: Routes.CARD.ONBOARDING.ROOT,
} as const satisfies Record<MoneyCardReturnScreen, string>;
