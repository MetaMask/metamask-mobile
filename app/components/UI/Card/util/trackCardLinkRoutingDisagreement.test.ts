import { trackCardLinkRoutingDisagreement } from './trackCardLinkRoutingDisagreement';

const mockTrackEvent = jest.fn();
jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

describe('trackCardLinkRoutingDisagreement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks nothing when the links and the legacy label agree', () => {
    trackCardLinkRoutingDisagreement(
      {
        hasCard: true,
        provider: 'baanx',
        source: 'card_links',
        disagreesWithLegacy: false,
      },
      'card_welcome',
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks Card Link Routing Disagreement with the routing decision', () => {
    trackCardLinkRoutingDisagreement(
      {
        hasCard: true,
        provider: 'immersve',
        source: 'card_links',
        disagreesWithLegacy: true,
      },
      'deeplink_card_home',
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const [event] = mockTrackEvent.mock.calls[0];
    expect(event.name).toBe('Card Link Routing Disagreement');
    expect(event.properties).toStrictEqual({
      entry_point: 'deeplink_card_home',
      routed_by: 'card_links',
      links_say_card: true,
      linked_provider: 'immersve',
    });
  });

  it('reports links_say_card false when the legacy label routed', () => {
    trackCardLinkRoutingDisagreement(
      {
        hasCard: true,
        provider: null,
        source: 'legacy',
        disagreesWithLegacy: true,
      },
      'deeplink_card_onboarding',
    );

    expect(mockTrackEvent.mock.calls[0][0].properties).toMatchObject({
      entry_point: 'deeplink_card_onboarding',
      routed_by: 'legacy',
      links_say_card: false,
    });
  });
});
