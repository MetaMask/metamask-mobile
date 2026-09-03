import React from 'react';
import { screen } from '@testing-library/react-native';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import DiscoveryErrorScreenRouter, {
  isDiscoveryErrorStep,
  shouldShowGenericProviderError,
} from './DiscoveryErrorScreenRouter';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';
import {
  DISCOVERY_ERROR_SCREEN_CONFIGS,
  DISCOVERY_ERROR_STEPS,
} from './discoveryErrorScreenConfigs';
import { strings } from '../../../../../../../locales/i18n';

const CONFIG = DISCOVERY_ERROR_SCREEN_CONFIGS;

const ERROR_STEP_CASES = DISCOVERY_ERROR_STEPS.map((step) => ({
  step,
  title: strings(CONFIG[step].titleKey),
  action:
    CONFIG[step].primaryButton?.role === 'retry' ||
    CONFIG[step].secondaryButton?.role === 'retry'
      ? ('onRetry' as const)
      : ('onNotNow' as const),
}));

const NON_ERROR_STEPS: DiscoveryStep[] = [
  DiscoveryStep.Searching,
  DiscoveryStep.PermissionDenied,
  DiscoveryStep.Found,
  DiscoveryStep.Accounts,
];

const renderScreen = (ui: React.ReactElement) =>
  renderWithProvider(ui, undefined, false);

describe('DiscoveryErrorScreenRouter', () => {
  it.each(ERROR_STEP_CASES)(
    'renders $step screen',
    ({ step, title, action }) => {
      const props = { step, [action]: jest.fn() };
      renderScreen(<DiscoveryErrorScreenRouter {...props} />);
      expect(screen.getByText(title)).toBeOnTheScreen();
    },
  );

  it('renders generic provider error screen', () => {
    renderScreen(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Searching}
        showGenericProviderError
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings(CONFIG['something-went-wrong'].titleKey)),
    ).toBeOnTheScreen();
  });

  it('prioritizes generic provider error over mapped step', () => {
    renderScreen(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.DeviceLocked}
        showGenericProviderError
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings(CONFIG['something-went-wrong'].titleKey)),
    ).toBeOnTheScreen();
  });

  it.each(NON_ERROR_STEPS)('returns null for non-error step %s', (step) => {
    const { toJSON } = renderScreen(
      <DiscoveryErrorScreenRouter step={step} onRetry={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});

describe('isDiscoveryErrorStep', () => {
  it.each([...DISCOVERY_ERROR_STEPS] as DiscoveryStep[])(
    'returns true for %s',
    (step) => {
      expect(isDiscoveryErrorStep(step)).toBe(true);
    },
  );

  it.each(NON_ERROR_STEPS)('returns false for %s', (step) => {
    expect(isDiscoveryErrorStep(step)).toBe(false);
  });
});

describe('shouldShowGenericProviderError', () => {
  it('returns true when provider is in error state without a mapped step', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.ErrorState, null),
    ).toBe(true);
  });

  it.each([
    ConnectionStatus.Disconnected,
    ConnectionStatus.Connected,
    ConnectionStatus.Connecting,
  ] as ConnectionStatus[])(
    'returns false for non-error status %s',
    (status) => {
      expect(shouldShowGenericProviderError(status, null)).toBe(false);
    },
  );

  it('returns false when provider error maps to a discovery step', () => {
    expect(
      shouldShowGenericProviderError(
        ConnectionStatus.ErrorState,
        DiscoveryStep.DeviceLocked,
      ),
    ).toBe(false);
  });
});
