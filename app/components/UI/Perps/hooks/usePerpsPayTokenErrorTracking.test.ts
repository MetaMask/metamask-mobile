import { renderHook } from '@testing-library/react-native';
import {
  usePerpsPayTokenErrorTracking,
  getBlockingAlertMessage,
} from './usePerpsPayTokenErrorTracking';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { Alert } from '../../../Views/confirmations/types/alerts';

jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

const mockUsePerpsEventTracking = jest.mocked(usePerpsEventTracking);

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  key: 'TestAlert',
  severity: 'danger' as Alert['severity'],
  message: 'default message',
  isBlocking: true,
  ...overrides,
});

describe('getBlockingAlertMessage', () => {
  it('returns message when it is a string', () => {
    expect(getBlockingAlertMessage(makeAlert({ message: 'Token low' }))).toBe(
      'Token low',
    );
  });

  it('returns title when message is not a string', () => {
    expect(
      getBlockingAlertMessage(
        makeAlert({ message: undefined, title: 'Title fallback' }),
      ),
    ).toBe('Title fallback');
  });

  it('returns key when neither message nor title exist', () => {
    expect(
      getBlockingAlertMessage(makeAlert({ message: undefined, key: 'MyKey' })),
    ).toBe('MyKey');
  });

  it('returns unknown_blocking_alert when nothing is available', () => {
    expect(
      getBlockingAlertMessage({
        severity: 'danger',
        isBlocking: true,
      } as Alert),
    ).toBe('unknown_blocking_alert');
  });

  it('returns unknown_blocking_alert for undefined input', () => {
    expect(getBlockingAlertMessage(undefined)).toBe('unknown_blocking_alert');
  });
});

describe('usePerpsPayTokenErrorTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes blocking-alert validation tracking options when alerts are present', () => {
    const blockingAlert = makeAlert({
      message: 'Insufficient balance for pay token',
    });

    renderHook(() =>
      usePerpsPayTokenErrorTracking({
        hasBlockingPayAlerts: true,
        blockingPayAlerts: [blockingAlert],
        hasInsufficientPayTokenBalance: false,
      }),
    );

    expect(mockUsePerpsEventTracking).toHaveBeenCalledTimes(2);

    const validationOpts = mockUsePerpsEventTracking.mock.calls[0][0];
    expect(validationOpts).toEqual(
      expect.objectContaining({
        conditions: [true, true],
        resetConditions: [false],
        properties: expect.objectContaining({
          error_type: 'validation',
          error_message: 'Insufficient balance for pay token',
          screen_name: 'perps_order',
          screen_type: 'trading',
        }),
      }),
    );
  });

  it('passes disabled conditions when no blocking alerts exist', () => {
    renderHook(() =>
      usePerpsPayTokenErrorTracking({
        hasBlockingPayAlerts: false,
        blockingPayAlerts: [],
        hasInsufficientPayTokenBalance: false,
      }),
    );

    const validationOpts = mockUsePerpsEventTracking.mock.calls[0][0];
    expect(validationOpts?.conditions).toEqual([false, false]);
    expect(validationOpts?.resetConditions).toEqual([true]);
  });

  it('passes insufficient-balance warning tracking options when flag is true', () => {
    renderHook(() =>
      usePerpsPayTokenErrorTracking({
        hasBlockingPayAlerts: false,
        blockingPayAlerts: [],
        hasInsufficientPayTokenBalance: true,
      }),
    );

    const warningOpts = mockUsePerpsEventTracking.mock.calls[1][0];
    expect(warningOpts).toEqual(
      expect.objectContaining({
        conditions: [true],
        resetConditions: [false],
        properties: expect.objectContaining({
          error_type: 'warning',
          warning_message: 'insufficient_balance',
          screen_name: 'perps_order',
          screen_type: 'trading',
        }),
      }),
    );
  });

  it('passes disabled warning conditions when balance is sufficient', () => {
    renderHook(() =>
      usePerpsPayTokenErrorTracking({
        hasBlockingPayAlerts: false,
        blockingPayAlerts: [],
        hasInsufficientPayTokenBalance: false,
      }),
    );

    const warningOpts = mockUsePerpsEventTracking.mock.calls[1][0];
    expect(warningOpts?.conditions).toEqual([false]);
    expect(warningOpts?.resetConditions).toEqual([true]);
  });

  it('uses title fallback in validation properties when alert has no string message', () => {
    const titleAlert = makeAlert({
      message: undefined,
      title: 'No quotes available',
    });

    renderHook(() =>
      usePerpsPayTokenErrorTracking({
        hasBlockingPayAlerts: true,
        blockingPayAlerts: [titleAlert],
        hasInsufficientPayTokenBalance: false,
      }),
    );

    const validationOpts = mockUsePerpsEventTracking.mock.calls[0][0];
    expect(validationOpts?.properties?.error_message).toBe(
      'No quotes available',
    );
  });
});
