import type { ABTestAnalyticsMapping } from './abTestAnalytics.types';
import { CARD_BUTTON_BADGE_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Card/components/CardButton/abTestConfig';
import { NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Bridge/components/GaslessQuickPickOptions/abTestConfig';
import { SWAP_DISCOVERY_FEED_REVAMP_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Bridge/components/SwapDiscoveryFeed/abTestConfig';
import { BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Bridge/components/TokenButton.abTestConfig';
import { TOKEN_SELECTOR_BALANCE_LAYOUT_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Bridge/components/TokenSelectorItem.abTestConfig';
import {
  HOMEPAGE_DISCOVERY_PILLS_AB_TEST_ANALYTICS_MAPPING,
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_HOME_VIEWED_MAPPING,
  HOMEPAGE_TRENDING_SECTIONS_AB_TEST_ANALYTICS_MAPPING,
  HUB_PAGE_DISCOVERY_TABS_AB_TEST_ANALYTICS_MAPPING,
} from '../../components/Views/Homepage/abTestConfig';
import { AMBIENT_PRICE_COLOR_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/TokenDetails/components/abTestConfig';
import { SOCIAL_AI_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING } from '../../components/Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/abTestConfig';
import { WHATS_HAPPENING_EXPLORE_AB_TEST_ANALYTICS_MAPPING } from '../../components/Views/TrendingView/abTestConfig';
import { EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING } from '../../components/Views/TrendingView/search/abTestConfig';
import { ONBOARDING_CHECKLIST_STEPPER_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/WalletHomeOnboardingSteps/abTestConfig';
import { ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_ANALYTICS_MAPPING } from '../../components/Views/OnboardingInterestQuestionnaire/abTestConfig';
import { BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Perps/abTestConfig';

export const AB_TEST_ANALYTICS_MAPPINGS: readonly ABTestAnalyticsMapping[] = [
  // Card
  CARD_BUTTON_BADGE_AB_TEST_ANALYTICS_MAPPING,

  // Swaps
  NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING,
  SWAP_DISCOVERY_FEED_REVAMP_AB_TEST_ANALYTICS_MAPPING,
  BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_TEST_ANALYTICS_MAPPING,
  TOKEN_SELECTOR_BALANCE_LAYOUT_AB_TEST_ANALYTICS_MAPPING,

  // Homepage
  HOMEPAGE_DISCOVERY_PILLS_AB_TEST_ANALYTICS_MAPPING,
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_HOME_VIEWED_MAPPING,
  HOMEPAGE_TRENDING_SECTIONS_AB_TEST_ANALYTICS_MAPPING,
  HUB_PAGE_DISCOVERY_TABS_AB_TEST_ANALYTICS_MAPPING,

  // Wallet home onboarding checklist
  ONBOARDING_CHECKLIST_STEPPER_AB_TEST_ANALYTICS_MAPPING,

  // Onboarding interest questionnaire
  ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_ANALYTICS_MAPPING,

  // Explore
  WHATS_HAPPENING_EXPLORE_AB_TEST_ANALYTICS_MAPPING,
  EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING,

  // Token Details
  AMBIENT_PRICE_COLOR_AB_TEST_ANALYTICS_MAPPING,

  // Quick Buy
  SOCIAL_AI_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING,

  // Perps
  BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING,
];
