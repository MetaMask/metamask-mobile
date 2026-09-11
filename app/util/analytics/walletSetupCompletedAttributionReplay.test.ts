import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import {
  enrichBufferedWalletSetupCompletedEvent,
  scheduleBufferedOnboardingEventReplay,
} from './walletSetupCompletedAttributionReplay';

jest.useFakeTimers();

describe('enrichBufferedWalletSetupCompletedEvent', () => {
  it('merges attribution props into buffered Wallet Setup Completed events', () => {
    const buffered = AnalyticsEventBuilder.createEventBuilder(
      EVENT_NAME.WALLET_SETUP_COMPLETED,
    )
      .addProperties({
        wallet_setup_type: 'new',
        new_wallet: true,
      })
      .build();

    const enriched = enrichBufferedWalletSetupCompletedEvent(buffered, {
      utm_source: 'email',
      utm_campaign: 'spring',
    });

    expect(enriched.properties).toEqual({
      wallet_setup_type: 'new',
      new_wallet: true,
      utm_source: 'email',
      utm_campaign: 'spring',
    });
  });

  it('returns the original event for non Wallet Setup Completed events', () => {
    const buffered = AnalyticsEventBuilder.createEventBuilder(
      EVENT_NAME.WALLET_CREATED,
    ).build();

    const enriched = enrichBufferedWalletSetupCompletedEvent(buffered, {
      utm_source: 'email',
    });

    expect(enriched).toBe(buffered);
  });

  it('returns the original event when attribution props are empty', () => {
    const buffered = AnalyticsEventBuilder.createEventBuilder(
      EVENT_NAME.WALLET_SETUP_COMPLETED,
    ).build();

    const enriched = enrichBufferedWalletSetupCompletedEvent(buffered, {});

    expect(enriched).toBe(buffered);
  });
});

describe('scheduleBufferedOnboardingEventReplay', () => {
  it('replays buffered events with staggered delays and enriches Wallet Setup Completed', () => {
    const trackEvent = jest.fn();
    const walletSetupBuffered = AnalyticsEventBuilder.createEventBuilder(
      EVENT_NAME.WALLET_SETUP_COMPLETED,
    )
      .addProperties({ wallet_setup_type: 'new' })
      .build();
    const walletCreatedBuffered = AnalyticsEventBuilder.createEventBuilder(
      EVENT_NAME.WALLET_CREATED,
    ).build();

    scheduleBufferedOnboardingEventReplay({
      events: [[walletSetupBuffered], [walletCreatedBuffered]],
      attributionProps: { utm_source: 'deeplink' },
      trackEvent,
      eventTrackingDelayMs: 100,
    });

    expect(trackEvent).not.toHaveBeenCalled();

    jest.advanceTimersByTime(0);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent.mock.calls[0][0].name).toBe(
      EVENT_NAME.WALLET_SETUP_COMPLETED,
    );
    expect(trackEvent.mock.calls[0][0].properties).toEqual({
      wallet_setup_type: 'new',
      utm_source: 'deeplink',
    });

    jest.advanceTimersByTime(100);
    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent.mock.calls[1][0].name).toBe(EVENT_NAME.WALLET_CREATED);
    expect(trackEvent.mock.calls[1][0].properties).toEqual({});
  });
});
