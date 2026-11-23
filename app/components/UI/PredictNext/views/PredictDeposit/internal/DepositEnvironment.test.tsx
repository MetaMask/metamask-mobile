import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { useVenueCapabilities } from '../../../capabilities';
import type { PredictVenueCapabilities } from '../../../capabilities/types';
import {
  BASE_DEPOSIT_NETWORK,
  BASE_SEPOLIA_DEPOSIT_NETWORK,
  type PredictDepositEnvironment,
} from '../../../config/depositEnvironment';
import type { PredictVenueEnvironment, PredictVenueId } from '../../../types';
import {
  DepositEnvironmentOverride,
  useDepositEnvironment,
} from './DepositEnvironment';

jest.mock('../../../capabilities', () => ({
  ...jest.requireActual('../../../capabilities'),
  useVenueCapabilities: jest.fn(),
}));

const KALSHI_ID = 'kalshi' as PredictVenueId;

const readyCapabilities = (
  environment: PredictVenueEnvironment,
): PredictVenueCapabilities => ({
  status: 'ready',
  descriptor: {
    venueId: KALSHI_ID,
    displayName: 'Kalshi',
    environment,
    actions: ['deposit'],
    feeds: {},
    categories: [],
    searchSupported: false,
    screens: [],
  },
});

const renderEnvironmentHook = (
  capabilities: PredictVenueCapabilities,
  override?: PredictDepositEnvironment,
) => {
  jest.mocked(useVenueCapabilities).mockReturnValue(capabilities);
  const wrapper = ({ children }: { children: ReactNode }) =>
    override ? (
      <DepositEnvironmentOverride value={override}>
        {children}
      </DepositEnvironmentOverride>
    ) : (
      <>{children}</>
    );

  return renderHook(() => useDepositEnvironment(KALSHI_ID), { wrapper });
};

describe('useDepositEnvironment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives DepositEnvironmentOverride priority over catalog capabilities', () => {
    const override: PredictDepositEnvironment = {
      network: BASE_DEPOSIT_NETWORK,
      transferMode: 'simulated',
    };

    for (const capabilities of [
      { status: 'loading' },
      { status: 'unavailable', reason: 'invalid_catalog' },
      readyCapabilities('sandbox'),
    ] as PredictVenueCapabilities[]) {
      const { result } = renderEnvironmentHook(capabilities, override);
      expect(result.current).toStrictEqual({
        status: 'ready',
        environment: override,
      });
    }
  });

  it('resolves sandbox and production environments from capabilities', () => {
    const sandbox = renderEnvironmentHook(readyCapabilities('sandbox'));
    expect(sandbox.result.current).toStrictEqual({
      status: 'ready',
      environment: {
        network: BASE_SEPOLIA_DEPOSIT_NETWORK,
        transferMode: 'simulated',
      },
    });

    const production = renderEnvironmentHook(readyCapabilities('production'));
    expect(production.result.current).toStrictEqual({
      status: 'ready',
      environment: {
        network: BASE_DEPOSIT_NETWORK,
        transferMode: 'wallet',
      },
    });
  });

  it('keeps the resolved environment reference stable when capabilities refresh with the same environment', () => {
    jest
      .mocked(useVenueCapabilities)
      .mockReturnValue(readyCapabilities('production'));
    const { result, rerender } = renderHook(() =>
      useDepositEnvironment(KALSHI_ID),
    );
    const first = result.current;

    jest
      .mocked(useVenueCapabilities)
      .mockReturnValue(readyCapabilities('production'));
    rerender({});

    expect(result.current).toBe(first);
  });

  it('propagates loading, retryable error, and non-retryable unavailable reasons', () => {
    expect(
      renderEnvironmentHook({ status: 'loading' }).result.current,
    ).toStrictEqual({ status: 'loading' });

    const retry = jest.fn();
    expect(
      renderEnvironmentHook({
        status: 'unavailable',
        reason: 'error',
        retry,
      }).result.current,
    ).toStrictEqual({
      status: 'unavailable',
      reason: 'error',
      retry,
    });

    expect(
      renderEnvironmentHook({
        status: 'unavailable',
        reason: 'invalid_catalog',
      }).result.current,
    ).toStrictEqual({
      status: 'unavailable',
      reason: 'invalid_catalog',
    });
  });
});
