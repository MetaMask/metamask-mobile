/**
 * Component View tests for the Settings marketing-consent toggle
 * (MetaMetricsAndDataCollectionSection) of a social-login (seedless) user.
 *
 * Regression coverage for the 8.18.1 prod desync (MMQA-2604, GE-644, GE-647):
 * the local choice is the source of truth, the auth-server sync is
 * best-effort, and a failed sync never reverts the local decision — the
 * auth-server marketing endpoint is exercised over the wire (nock + shared
 * fetch stub), not mocked at module level.
 *
 * Run: yarn jest -c jest.config.view.js MetaMetricsAndDataCollectionSection.view.test.tsx --runInBand
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  clearSeedlessAuthServerMocks,
  getSeedlessAuthServerRequests,
  setupSeedlessAuthServerMocks,
} from '../../../../../../../tests/component-view/api-mocking/seedless-onboarding';
import {
  findTrackedEvent,
  isMarketingSyncError,
} from '../../../../../../../tests/component-view/helpers/analytics';
import { renderSecuritySettingsMarketingSection } from '../../../../../../../tests/component-view/renderers/seedlessOnboarding';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import Routes from '../../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { analytics } from '../../../../../../util/analytics/analytics';
import Logger from '../../../../../../util/Logger';
import { UserProfileProperty } from '../../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
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

/** The local choice after the auth-server sync, as the wire saw it. */
const ONE_OPT_OUT_POST = [{ method: 'POST', body: { opt_in_status: false } }];

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

    const toggleMarketingOffAndExpectLocalOptOut = async (
      screen: ReturnType<typeof renderSecuritySettingsMarketingSection>,
    ) => {
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
      expect(renderedSwitchValue(marketingSwitch)).toBe(false);

      expect(identifySpy).toHaveBeenCalledWith({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
      });
      expect(
        findTrackedEvent(
          trackEventSpy,
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
        ),
      ).toMatchObject({
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
          location: 'settings',
          updated_after_onboarding: true,
        }),
      });

      await screen.findByTestId(`route-${Routes.MODAL.ROOT_MODAL_FLOW}`);
    };

    it('keeps marketing consent off after the auth-server sync fails, including after a remount', async () => {
      // Desync setup: the server still holds is_opt_in=true while the sync
      // POST fails with HTTP 500.
      setupSeedlessAuthServerMocks({
        marketingOptIn: true,
        marketingPostFails: true,
      });
      const screen = renderSecuritySettingsMarketingSection({
        dataCollectionForMarketing: true,
      });

      await toggleMarketingOffAndExpectLocalOptOut(screen);

      await waitFor(() => {
        expect(loggerErrorSpy.mock.calls.some(isMarketingSyncError)).toBe(true);
      });
      expect(getSeedlessAuthServerRequests()).toEqual(ONE_OPT_OUT_POST);

      // Relaunch: the section remounts on the restored local state and must
      // not read the auth server (its stale is_opt_in=true) or re-sync.
      const persistedState = screen.store.getState();
      screen.unmount();

      const remounted = renderSecuritySettingsMarketingSection({
        overrides: persistedState as DeepPartial<RootState>,
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
      expect(getSeedlessAuthServerRequests()).toEqual(ONE_OPT_OUT_POST);
    });

    it('syncs the opt-out to the auth server without errors', async () => {
      setupSeedlessAuthServerMocks({ marketingOptIn: true });
      const screen = renderSecuritySettingsMarketingSection({
        dataCollectionForMarketing: true,
      });

      await toggleMarketingOffAndExpectLocalOptOut(screen);

      await waitFor(() => {
        expect(getSeedlessAuthServerRequests()).toEqual(ONE_OPT_OUT_POST);
      });
      expect(loggerErrorSpy.mock.calls.some(isMarketingSyncError)).toBe(false);
    });
  },
);

/**
 * The consent-signal AND gate: marketing consent stores locally regardless of
 * MetaMetrics, but the consent signal only goes out while MetaMetrics is on.
 */
describeForPlatforms(
  'MetaMetricsAndDataCollectionSection — consent signal gate',
  () => {
    let identifySpy: jest.SpyInstance;
    let trackEventSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      identifySpy = jest.spyOn(analytics, 'identify');
      trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    });

    afterEach(() => {
      clearSeedlessAuthServerMocks();
      identifySpy.mockRestore();
      trackEventSpy.mockRestore();
    });

    it('stores consent without sending consent signals while MetaMetrics is off', async () => {
      setupSeedlessAuthServerMocks({});
      const screen = renderSecuritySettingsMarketingSection({
        dataCollectionForMarketing: false,
        overrides: {
          engine: {
            backgroundState: {
              AnalyticsController: { optedIn: false },
            },
          },
        },
      });

      const marketingSwitch = screen.getByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );
      fireEvent(marketingSwitch, 'valueChange', true);

      await waitFor(() => {
        expect(
          screen.store.getState().security.dataCollectionForMarketing,
        ).toBe(true);
      });
      expect(renderedSwitchValue(marketingSwitch)).toBe(true);
      expect(identifySpy).not.toHaveBeenCalled();
      expect(
        findTrackedEvent(
          trackEventSpy,
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
        ),
      ).toBeUndefined();
    });

    it('sends the consent signal when MetaMetrics is on', async () => {
      setupSeedlessAuthServerMocks({});
      const screen = renderSecuritySettingsMarketingSection({
        dataCollectionForMarketing: false,
      });

      const marketingSwitch = screen.getByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );
      fireEvent(marketingSwitch, 'valueChange', true);

      await waitFor(() => {
        expect(
          screen.store.getState().security.dataCollectionForMarketing,
        ).toBe(true);
      });
      expect(identifySpy).toHaveBeenCalledWith({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
      });
      expect(
        findTrackedEvent(
          trackEventSpy,
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
        ),
      ).toMatchObject({
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
          location: 'settings',
          updated_after_onboarding: true,
        }),
      });
    });
  },
);
