/**
 * Component View tests for the Settings marketing-consent toggle
 * (MetaMetricsAndDataCollectionSection) of a social-login (seedless) user.
 *
 * The local choice is the source of truth for marketing consent. Nothing is
 * read from or written to the auth server; the auth-server network guard fails
 * the test on any unexpected request.
 *
 * Run: yarn jest -c jest.config.view.js MetaMetricsAndDataCollectionSection.view.test.tsx --runInBand
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  clearSeedlessAuthServerMocks,
  setupSeedlessAuthServerMocks,
} from '../../../../../../../tests/component-view/api-mocking/seedless-onboarding';
import { renderSecuritySettingsMarketingSection } from '../../../../../../../tests/component-view/renderers/seedlessOnboarding';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import type { DeepPartial } from '../../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../../reducers';

/**
 * The RN Switch host element differs per platform in the jest tree:
 * iOS renders RCTSwitch (props.value), Android renders AndroidSwitch
 * (props.on). Read the rendered toggle position from whichever prop the
 * host carries.
 */
interface SwitchHostElement {
  props: { value?: boolean; on?: boolean };
}

const renderedSwitchValue = (
  switchElement: SwitchHostElement,
): boolean | undefined => switchElement.props.value ?? switchElement.props.on;

describeForPlatforms(
  'MetaMetricsAndDataCollectionSection — social login marketing consent',
  () => {
    afterEach(() => {
      clearSeedlessAuthServerMocks();
    });

    it('keeps the local opt-out across a remount without calling the auth server', async () => {
      setupSeedlessAuthServerMocks();
      const screen = renderSecuritySettingsMarketingSection({
        dataCollectionForMarketing: true,
      });

      const marketingSwitch = screen.getByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );
      expect(renderedSwitchValue(marketingSwitch)).toBe(true);

      fireEvent(marketingSwitch, 'valueChange', false);

      await waitFor(() => {
        expect(
          screen.store.getState().security.dataCollectionForMarketing,
        ).toBe(false);
      });

      // Relaunch: the section remounts on the restored local state.
      const persistedState = screen.store.getState();
      screen.unmount();

      const remounted = renderSecuritySettingsMarketingSection({
        overrides: persistedState as DeepPartial<RootState>,
      });

      expect(
        remounted.store.getState().security.dataCollectionForMarketing,
      ).toBe(false);
    });
  },
);
