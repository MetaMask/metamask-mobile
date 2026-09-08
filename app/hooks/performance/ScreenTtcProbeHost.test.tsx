import React from 'react';
import { act, render } from '@testing-library/react-native';
import ScreenTtcProbeHost from './ScreenTtcProbeHost';
import {
  recordScreenTtc,
  _resetScreenTtcRegistryForTesting,
  _setScreenTtcProbeEnabledForTesting,
} from './screenTtcRegistry';
import { OnboardingScreenIds } from './onboardingPerformanceIds';

jest.mock('../../util/test/utils', () => ({
  isE2EOrPerformanceTest: true,
}));

describe('ScreenTtcProbeHost', () => {
  beforeEach(() => {
    _resetScreenTtcRegistryForTesting();
    // Explicit restore even though reset clears the override — keeps suite order-safe.
    _setScreenTtcProbeEnabledForTesting(undefined);
  });

  it('renders nothing when the probe is disabled', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_LANDING, 10, 'filled');
    _setScreenTtcProbeEnabledForTesting(false);

    const { toJSON } = render(<ScreenTtcProbeHost />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when enabled but no TTC has been recorded', () => {
    const { toJSON } = render(<ScreenTtcProbeHost />);
    expect(toJSON()).toBeNull();
  });

  it('exposes recorded TTC via testID and accessibilityLabel', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_LANDING, 123.4, 'filled');

    const { getByTestId } = render(<ScreenTtcProbeHost />);
    const probe = getByTestId('perf-ttc-onboarding_landing');

    expect(probe.props.accessibilityLabel).toBe('ttc:onboarding_landing:123:1');
    expect(probe.props.accessible).toBe(true);
    expect(probe.props.importantForAccessibility).toBe('yes');
    expect(probe.props.pointerEvents).toBe('none');
  });

  it('updates probes when new TTC values are recorded', () => {
    const { getByTestId, queryByTestId } = render(<ScreenTtcProbeHost />);

    expect(queryByTestId('perf-ttc-onboarding_sheet')).toBeNull();

    act(() => {
      recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 88, 'filled');
    });

    expect(
      getByTestId('perf-ttc-onboarding_sheet').props.accessibilityLabel,
    ).toBe('ttc:onboarding_sheet:88:1');

    act(() => {
      recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 99, 'filled');
    });

    expect(
      getByTestId('perf-ttc-onboarding_sheet').props.accessibilityLabel,
    ).toBe('ttc:onboarding_sheet:99:2');
  });

  it('renders multiple screen probes when several TTC values exist', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_LANDING, 11, 'filled');
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 22, 'filled');

    const { getByTestId } = render(<ScreenTtcProbeHost />);

    expect(getByTestId('perf-ttc-onboarding_landing')).toBeTruthy();
    expect(getByTestId('perf-ttc-onboarding_sheet')).toBeTruthy();
  });
});
