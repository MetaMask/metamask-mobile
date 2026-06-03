import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import DiscoveryErrorScreenRouter, {
  isDiscoveryErrorStep,
  shouldShowGenericProviderError,
} from './DiscoveryErrorScreenRouter';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('./DiscoveryErrorScreenLayout', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return ({ title, testID }: { title: string; testID?: string }) =>
    ReactActual.createElement(
      Text,
      { testID: testID ?? 'discovery-error-layout' },
      title,
    );
});

describe('DiscoveryErrorScreenRouter', () => {
  it('renders device locked screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.DeviceLocked}
        onRetry={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.ledger_is_locked')),
    ).toBeOnTheScreen();
  });

  it('renders generic provider error screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Searching}
        showGenericProviderError
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('hardware_wallet.error.title')),
    ).toBeOnTheScreen();
  });

  it('returns null for non-error steps', () => {
    const { toJSON } = render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Searching}
        onRetry={jest.fn()}
      />,
    );

    expect(toJSON()).toBeNull();
  });
});

describe('isDiscoveryErrorStep', () => {
  it('identifies mapped discovery error steps', () => {
    expect(isDiscoveryErrorStep(DiscoveryStep.DeviceLocked)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.TransportUnavailable)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.Searching)).toBe(false);
    expect(isDiscoveryErrorStep(DiscoveryStep.PermissionDenied)).toBe(false);
  });
});

describe('shouldShowGenericProviderError', () => {
  it('returns true when provider is in error state without a mapped step', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.ErrorState, null),
    ).toBe(true);
  });

  it('returns false when provider error maps to a discovery step', () => {
    expect(
      shouldShowGenericProviderError(
        ConnectionStatus.ErrorState,
        DiscoveryStep.DeviceLocked,
      ),
    ).toBe(false);
  });

  it('returns false when provider is not in error state', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.Disconnected, null),
    ).toBe(false);
  });
});
