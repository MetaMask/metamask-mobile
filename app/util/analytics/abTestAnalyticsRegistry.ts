import type { ABTestAnalyticsMapping } from './abTestAnalytics.types';
import { CARD_BUTTON_BADGE_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Card/components/CardButton/abTestConfig';
import { NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Bridge/components/GaslessQuickPickOptions/abTestConfig';
import { TOKEN_SELECTOR_BALANCE_LAYOUT_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/Bridge/components/TokenSelectorItem.abTestConfig';
import {
  HOMEPAGE_TRENDING_SECTIONS_AB_TEST_ANALYTICS_MAPPING,
  HUB_PAGE_DISCOVERY_TABS_AB_TEST_ANALYTICS_MAPPING,
} from '../../components/Views/Homepage/abTestConfig';
import { STICKY_FOOTER_SWAP_LABEL_AB_TEST_ANALYTICS_MAPPING } from '../../components/UI/TokenDetails/components/abTestConfig';

export const AB_TEST_ANALYTICS_MAPPINGS: readonly ABTestAnalyticsMapping[] = [
  // Card
  CARD_BUTTON_BADGE_AB_TEST_ANALYTICS_MAPPING,

  // Swaps
  NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING,
  TOKEN_SELECTOR_BALANCE_LAYOUT_AB_TEST_ANALYTICS_MAPPING,

  // Homepage
  HOMEPAGE_TRENDING_SECTIONS_AB_TEST_ANALYTICS_MAPPING,
  HUB_PAGE_DISCOVERY_TABS_AB_TEST_ANALYTICS_MAPPING,

  // Token Details
  STICKY_FOOTER_SWAP_LABEL_AB_TEST_ANALYTICS_MAPPING,
];
