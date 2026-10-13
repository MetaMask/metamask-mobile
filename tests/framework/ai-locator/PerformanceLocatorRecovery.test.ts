import TimerStore from '../TimerStore.ts';
import {
  configurePerformanceLocatorRecovery,
  getPerformanceLocatorRecovery,
  setPerformanceSuiteActive,
} from './PerformanceLocatorRecovery.ts';
import type { LocatorRecoveryProvider } from './SelfHealingLocator.ts';

describe('getPerformanceLocatorRecovery', () => {
  const provider = {
    recover: jest.fn(),
  } as unknown as LocatorRecoveryProvider;
  const onRecovered = jest.fn();

  beforeEach(() => {
    TimerStore.resetTimers();
    configurePerformanceLocatorRecovery(undefined);
    setPerformanceSuiteActive(false);
    jest.clearAllMocks();
  });

  afterEach(() => {
    TimerStore.resetTimers();
    configurePerformanceLocatorRecovery(undefined);
  });

  it('returns configured recovery when no timer is running', () => {
    configurePerformanceLocatorRecovery({ provider, onRecovered });

    expect(getPerformanceLocatorRecovery()).toEqual({ provider, onRecovered });
  });

  it('suppresses recovery while a performance timer is active', () => {
    configurePerformanceLocatorRecovery({ provider, onRecovered });
    TimerStore.createTimer('metamask unlock');
    TimerStore.startTimer('metamask unlock');

    expect(getPerformanceLocatorRecovery()).toBeUndefined();
  });

  it('restores recovery after the active timer stops', () => {
    configurePerformanceLocatorRecovery({ provider, onRecovered });
    TimerStore.createTimer('metamask unlock');
    TimerStore.startTimer('metamask unlock');
    TimerStore.stopTimer('metamask unlock');

    expect(getPerformanceLocatorRecovery()).toEqual({ provider, onRecovered });
  });
});
