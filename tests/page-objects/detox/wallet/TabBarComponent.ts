import Matchers from '../../../framework/detox/Matchers';
import Gestures from '../../../framework/detox/Gestures';
import Assertions from '../../../framework/detox/Assertions';
import Utilities from '../../../framework/detox/Utilities';
import { TabBarSelectorIDs } from '../../../../app/components/Nav/Main/TabBar.testIds';
import { EncapsulatedElementType } from '../../../framework/EncapsulatedElement';
import TrendingView from '../Trending/TrendingView';

/**
 * Detox-namespace tab bar page object (stripped).
 *
 * The canonical tests/page-objects/wallet/TabBarComponent.ts was rewritten for
 * the Appium migration and its getters now resolve through Appium matchers.
 * This detox copy keeps only the members the Detox Ledger/QR e2e world uses
 * (Explore tab navigation). The remaining tab navigation methods (Wallet,
 * Action, Activity, Browser and Settings entry points) were dropped here as
 * dead code in the detox namespace — they depended on Appium-typed shared page
 * objects (ActivitiesView, SettingsView, AccountMenu).
 */
class TabBarComponent {
  get tabBarExploreButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.EXPLORE);
  }

  async tapExploreButton(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarExploreButton, { timeout: 2000 });
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Trending view search button should be visible',
          timeout: 500,
        });
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Explore Button with Validation',
      },
    );
  }
}

export default new TabBarComponent();
