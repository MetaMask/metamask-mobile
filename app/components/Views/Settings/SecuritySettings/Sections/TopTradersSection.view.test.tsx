/**
 * Component-view tests for the Top Traders privacy toggle
 * (Settings > Security & Privacy > Top Traders section).
 *
 * These tests drive the real Redux state → rendered Switch → Engine messenger
 * pipeline without mocking hooks or selectors. Engine.controllerMessenger.call
 * is the only external boundary.
 *
 * Run with:
 *   yarn jest -c jest.config.view.js \
 *     app/components/Views/Settings/SecuritySettings/Sections/TopTradersSection.view.test.tsx \
 *     --runInBand --silent --coverage=false
 */

import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, screen } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { renderSettingsTopTradersSection } from '../../../../../../tests/component-view/renderers/socialLeaderboard';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';

// Convenience alias for the toggle's testID.
const TOGGLE_ID =
  SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings / TopTradersSection', () => {
  // -------------------------------------------------------------------------
  // 1. Section renders when both feature flags are on
  // -------------------------------------------------------------------------

  it('renders the Top Traders section and toggle when the feature flags are enabled', () => {
    renderSettingsTopTradersSection();

    // Section container is present.
    expect(
      screen.getByTestId(SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION),
    ).toBeOnTheScreen();

    // Toggle is visible and starts in the on (true) position.
    const toggle = screen.getByTestId(TOGGLE_ID);
    expect(toggle).toBeOnTheScreen();
    expect(toggle.props.value).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Section is hidden when the master feature flag is off
  // -------------------------------------------------------------------------

  it('renders nothing when the master leaderboard flag is disabled', () => {
    renderSettingsTopTradersSection({
      presetOptions: { featureEnabled: false },
    });

    expect(
      screen.queryByTestId(SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION),
    ).not.toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // 3. Opt-out: toggle from on → Engine.optOut → Redux updates to false
  // -------------------------------------------------------------------------

  it('calls Engine optOutOfLeaderboard and updates the store when the toggle is pressed from on', async () => {
    // Start with the user opted in (showAccountOnLeaderboard: true).
    const { store } = renderSettingsTopTradersSection({
      presetOptions: { showAccountOnLeaderboard: true },
    });

    const toggle = screen.getByTestId(TOGGLE_ID);
    expect(toggle.props.value).toBe(true);

    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    // Engine called with the opt-out action.
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'SocialController:optOutOfLeaderboard',
    );
    // Redux state updated.
    expect(store.getState().settings.showAccountOnLeaderboard).toBe(false);
    // The toggle now reflects the new state.
    expect(screen.getByTestId(TOGGLE_ID).props.value).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 4. Opt-in: toggle from off → Engine.optIn → Redux updates to true
  // -------------------------------------------------------------------------

  it('calls Engine optInToLeaderboard and updates the store when the toggle is pressed from off', async () => {
    // Start with the user opted out (showAccountOnLeaderboard: false).
    const { store } = renderSettingsTopTradersSection({
      presetOptions: { showAccountOnLeaderboard: false },
    });

    const toggle = screen.getByTestId(TOGGLE_ID);
    expect(toggle.props.value).toBe(false);

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'SocialController:optInToLeaderboard',
    );
    expect(store.getState().settings.showAccountOnLeaderboard).toBe(true);
    expect(screen.getByTestId(TOGGLE_ID).props.value).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. Error recovery: Engine throws → Redux state unchanged, toggle stays on
  // -------------------------------------------------------------------------

  it('does not update Redux state and keeps the toggle on when Engine throws during opt-out', async () => {
    // Simulate a transient network failure on opt-out.
    (Engine.controllerMessenger.call as jest.Mock).mockRejectedValueOnce(
      new Error('network error'),
    );

    const { store } = renderSettingsTopTradersSection({
      presetOptions: { showAccountOnLeaderboard: true },
    });

    await act(async () => {
      fireEvent(screen.getByTestId(TOGGLE_ID), 'valueChange', false);
    });

    // Store must NOT have been updated — the catch block skips the dispatch.
    expect(store.getState().settings.showAccountOnLeaderboard).toBe(true);
    // The toggle must still show on.
    expect(screen.getByTestId(TOGGLE_ID).props.value).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. Double-tap guard: second press while updating is a no-op
  // -------------------------------------------------------------------------

  it('ignores a second toggle press while the first Engine call is still in flight', async () => {
    // A never-settling promise simulates a slow network (in-flight request).
    let settle: () => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementationOnce(
      (action: string) =>
        action === 'SocialController:optOutOfLeaderboard'
          ? new Promise<void>((resolve) => {
              settle = resolve;
            })
          : Promise.resolve(undefined),
    );

    renderSettingsTopTradersSection({
      presetOptions: { showAccountOnLeaderboard: true },
    });

    const toggle = screen.getByTestId(TOGGLE_ID);

    // First press — starts the in-flight request.
    act(() => {
      fireEvent(toggle, 'valueChange', false);
    });

    // Second press while the first is still pending.
    act(() => {
      fireEvent(toggle, 'valueChange', false);
    });

    // Engine must have been called exactly once (the double-tap guard fired).
    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

    // Resolve so the component doesn't leak async work into subsequent tests.
    await act(async () => {
      settle();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Opt-flow gate: section hidden when optFlowEnabled flag is off
  // -------------------------------------------------------------------------

  it('renders nothing when the opt-in/out flow feature flag is disabled', () => {
    renderSettingsTopTradersSection({
      presetOptions: { optFlowEnabled: false },
    });

    expect(
      screen.queryByTestId(SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION),
    ).not.toBeOnTheScreen();
  });
});
