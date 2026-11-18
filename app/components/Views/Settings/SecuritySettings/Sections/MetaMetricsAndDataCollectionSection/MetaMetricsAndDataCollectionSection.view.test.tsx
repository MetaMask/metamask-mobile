/**
 * Component View tests for the Settings marketing-consent toggle
 * (MetaMetricsAndDataCollectionSection) of a social-login (seedless) user.
 *
 * Regression coverage for the 8.18.1 prod desync (MMQA-2604, GE-644, GE-647):
 * the local choice (`state.security.dataCollectionForMarketing`) is the source
 * of truth, the auth-server sync (`POST /api/v1/oauth/marketing_opt_in_status`)
 * is best-effort, and a failed sync never reverts or overwrites the local
 * decision — not even after the section remounts.
 *
 * The OAuthService marketing POST is exercised over the wire with nock +
 * the shared fetch stub (`marketingPostFails: true`), not a module mock.
 *
 * Note: the `marketingAttribution` saga (Redux preference →
 * AnalyticsController consent copy) is not mounted by the component-view
 * framework; the `AnalyticsController.optedInToMarketing` end state stays
 * covered by the saga unit tests. Here we assert the view-visible outcomes:
 * the local choice, the `has_marketing_consent` identify trait and the
 * tracked preference event.
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
import Routes from '../../../../../../constants/navigation/Routes';
import { analytics } from '../../../../../../util/analytics/analytics';
import Logger from '../../../../../../util/Logger';
import { UserProfileProperty } from '../../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

const ANALYTICS_PREFERENCE_SELECTED = 'Analytics Preference Selected';
/** Same auth-server copy the settings screen syncs to. */
const MARKETING_SYNC_ERROR = 'Failed to update marketing opt-in status';

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

const isMarketingSyncError = (call: unknown[]): boolean => {
  const [error] = call;
  return error instanceof Error && error.message.includes(MARKETING_SYNC_ERROR);
};

const findTrackedEvent = (
  trackEventSpy: jest.SpyInstance,
  eventName: string,
): Record<string, unknown> | undefined =>
  trackEventSpy.mock.calls
    .map((call) => call[0])
    .find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'name' in event &&
        (event as Record<string, unknown>).name === eventName,
    ) as Record<string, unknown> | undefined;

describeForPlatforms(
  'MetaMetricsAndDataCollectionSection — social login marketing consent',
  () => {
    let identifySpy: jest.SpyInstance;
    let trackEventSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      identifySpy = jest.spyOn(analytics, 'identify');
      trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      loggerErrorSpy = jest
        .spyOn(Logger, 'error')
        .mockImplementation(() => Promise.resolve());
    });

    afterEach(() => {
      clearSeedlessAuthServerMocks();
      identifySpy.mockRestore();
      trackEventSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it('keeps marketing consent off after the auth-server sync fails, including after a remount', async () => {
      // Desync setup from 8.18.1: the auth server still holds is_opt_in=true
      // while the user opts out and the sync POST fails (HTTP 500).
      setupSeedlessAuthServerMocks({
        marketingOptIn: true,
        marketingPostFails: true,
      });
      const { getByTestId, findByTestId, store, unmount } =
        renderSecuritySettingsMarketingSection({
          dataCollectionForMarketing: true,
        });

      const marketingSwitch = getByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );
      expect(renderedSwitchValue(marketingSwitch)).toBe(true);

      fireEvent(marketingSwitch, 'valueChange', false);

      await waitFor(() => {
        expect(store.getState().security.dataCollectionForMarketing).toBe(
          false,
        );
      });

      // The failed sync is reported but the local choice is kept.
      expect(renderedSwitchValue(marketingSwitch)).toBe(false);
      expect(loggerErrorSpy.mock.calls.some(isMarketingSyncError)).toBe(true);

      // The opt-out reaches the identify traits and the preference event.
      expect(identifySpy).toHaveBeenCalledWith({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
      });
      const preferenceEvent = findTrackedEvent(
        trackEventSpy,
        ANALYTICS_PREFERENCE_SELECTED,
      );
      expect(preferenceEvent).toMatchObject({
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
          location: 'settings',
          updated_after_onboarding: true,
        }),
      });

      // Turning marketing consent off also opens the confirmation sheet.
      await findByTestId(`route-${Routes.MODAL.ROOT_MODAL_FLOW}`);

      // Relaunch: the section remounts with the persisted local choice and
      // must not overwrite it with the auth server value (still is_opt_in=true).
      const persistedMarketingConsent =
        store.getState().security.dataCollectionForMarketing;
      unmount();

      const remounted = renderSecuritySettingsMarketingSection({
        dataCollectionForMarketing: Boolean(persistedMarketingConsent),
      });

      await waitFor(() => {
        expect(
          renderedSwitchValue(
            remounted.getByTestId(
              SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
            ),
          ),
        ).toBe(false);
      });
      expect(
        remounted.store.getState().security.dataCollectionForMarketing,
      ).toBe(false);
    });

    it('keeps marketing consent off and reports has_marketing_consent=false when the auth-server sync succeeds', async () => {
      setupSeedlessAuthServerMocks({ marketingOptIn: true });
      const { getByTestId, findByTestId, store } =
        renderSecuritySettingsMarketingSection({
          dataCollectionForMarketing: true,
        });

      const marketingSwitch = getByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );
      expect(renderedSwitchValue(marketingSwitch)).toBe(true);

      fireEvent(marketingSwitch, 'valueChange', false);

      await waitFor(() => {
        expect(store.getState().security.dataCollectionForMarketing).toBe(
          false,
        );
      });

      // The opt-out still opens the confirmation sheet and is synced to the
      // auth server without errors.
      await findByTestId(`route-${Routes.MODAL.ROOT_MODAL_FLOW}`);
      expect(renderedSwitchValue(marketingSwitch)).toBe(false);
      expect(loggerErrorSpy.mock.calls.some(isMarketingSyncError)).toBe(false);

      expect(identifySpy).toHaveBeenCalledWith({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
      });
      const preferenceEvent = findTrackedEvent(
        trackEventSpy,
        ANALYTICS_PREFERENCE_SELECTED,
      );
      expect(preferenceEvent).toMatchObject({
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
          location: 'settings',
          updated_after_onboarding: true,
        }),
      });
    });
  },
);
