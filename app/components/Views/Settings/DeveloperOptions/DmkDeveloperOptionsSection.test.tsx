import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import DmkDeveloperOptionsSection from './DmkDeveloperOptionsSection';
import { useFeatureFlagOverride } from '../../../../contexts/FeatureFlagOverrideContext';

jest.mock('../../../../contexts/FeatureFlagOverrideContext', () => {
  const ActualReact = jest.requireActual('react');
  return {
    useFeatureFlagOverride: jest.fn(),
    // Pass-through provider so renderWithProvider can still wrap with it.
    FeatureFlagOverrideProvider: ActualReact.Fragment,
    FeatureFlagOverrideContext: {
      Provider: ActualReact.Fragment,
    },
  };
});

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

// Ensure version-gated validation isn't short-circuited by the build-time
// override kill switch in dev tests.
jest.mock('../../../../core/Engine/controllers/remote-feature-flag-controller', () => ({
  isRemoteFeatureFlagOverrideActivated: false,
}));

const mockUseFeatureFlagOverride = useFeatureFlagOverride as jest.Mock;
const DMK_FLAG_KEY = 'enableDMK';
const DMK_SWITCH_TEST_ID = 'dmk-dev-toggle-switch';

/**
 * Build a partial RootState where RemoteFeatureFlagController has the
 * enableDMK flag set with the given enabled value. This is what flows
 * through `selectEnableDMK`.
 */
const buildState = (enabled: boolean) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [DMK_FLAG_KEY]: { enabled, minimumVersion: '1.0.0' },
        },
        localOverrides: {},
        rawRemoteFeatureFlags: {
          [DMK_FLAG_KEY]: { enabled, minimumVersion: '1.0.0' },
        },
      },
    },
  },
});

const setupContext = (overrides: Partial<{
  hasOverride: boolean;
  setOverride: jest.Mock;
  removeOverride: jest.Mock;
}> = {}) => {
  const hasOverride = overrides.hasOverride ?? false;
  mockUseFeatureFlagOverride.mockReturnValue({
    hasOverride: (key: string) => key === DMK_FLAG_KEY && hasOverride,
    setOverride: overrides.setOverride ?? jest.fn(),
    removeOverride: overrides.removeOverride ?? jest.fn(),
    featureFlags: {},
    featureFlagsList: [],
    overrides: {},
    clearAllOverrides: jest.fn(),
    getOverrideCount: () => 0,
    originalFlags: {},
  });
};

describe('DmkDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section heading', () => {
    setupContext();
    const { getByText } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    expect(getByText('Ledger Device Management Kit (DMK)')).toBeDefined();
  });

  it('renders a description explaining the toggle', () => {
    setupContext();
    const { getByText } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    expect(
      getByText(/Toggle the enableDMK feature flag for local development/),
    ).toBeDefined();
  });

  it('shows "Enabled" status text when DMK is enabled', () => {
    setupContext();
    const { getByText } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(true) },
    );
    expect(getByText('Status: Enabled')).toBeDefined();
  });

  it('shows "Disabled" status text when DMK is disabled', () => {
    setupContext();
    const { getByText } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    expect(getByText('Status: Disabled')).toBeDefined();
  });

  it('renders a Switch component', () => {
    setupContext();
    const { getByTestId } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    expect(getByTestId(DMK_SWITCH_TEST_ID)).toBeDefined();
  });

  it('switch is ON when DMK is enabled', () => {
    setupContext();
    const { getByTestId } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(true) },
    );
    expect(getByTestId(DMK_SWITCH_TEST_ID).props.value).toBe(true);
  });

  it('switch is OFF when DMK is disabled', () => {
    setupContext();
    const { getByTestId } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    expect(getByTestId(DMK_SWITCH_TEST_ID).props.value).toBe(false);
  });

  it('calls setOverride with version-gated shape when switch is toggled ON', () => {
    const setOverride = jest.fn();
    setupContext({ hasOverride: false, setOverride });
    const { getByTestId } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    fireEvent(getByTestId(DMK_SWITCH_TEST_ID), 'valueChange', true);
    expect(setOverride).toHaveBeenCalledTimes(1);
    expect(setOverride).toHaveBeenCalledWith(DMK_FLAG_KEY, {
      enabled: true,
      minimumVersion: '1.0.0',
    });
  });

  it('calls removeOverride when switch is toggled OFF and flag is currently overridden', () => {
    const removeOverride = jest.fn();
    setupContext({ hasOverride: true, removeOverride });
    const { getByTestId } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(true) },
    );
    fireEvent(getByTestId(DMK_SWITCH_TEST_ID), 'valueChange', false);
    expect(removeOverride).toHaveBeenCalledTimes(1);
    expect(removeOverride).toHaveBeenCalledWith(DMK_FLAG_KEY);
  });

  it('calls setOverride with disabled shape when switch is toggled OFF but flag was not overridden', () => {
    const setOverride = jest.fn();
    setupContext({ hasOverride: false, setOverride });
    const { getByTestId } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(true) },
    );
    fireEvent(getByTestId(DMK_SWITCH_TEST_ID), 'valueChange', false);
    expect(setOverride).toHaveBeenCalledTimes(1);
    expect(setOverride).toHaveBeenCalledWith(DMK_FLAG_KEY, {
      enabled: false,
      minimumVersion: '1.0.0',
    });
  });

  it('shows "Overridden" indicator when the flag has a local override', () => {
    setupContext({ hasOverride: true });
    const { getByText } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(true) },
    );
    expect(getByText('Overridden')).toBeDefined();
  });

  it('does not show "Overridden" indicator when no override is active', () => {
    setupContext({ hasOverride: false });
    const { queryByText } = renderWithProvider(
      <DmkDeveloperOptionsSection />,
      { state: buildState(false) },
    );
    expect(queryByText('Overridden')).toBeNull();
  });
});
