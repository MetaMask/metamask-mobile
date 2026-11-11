import { fillOfferEndsIn } from './fillOfferEndsIn';

describe('fillOfferEndsIn', () => {
  const now = Date.parse('2026-10-01T00:00:00.000Z');
  const copy = {
    offerEndsIn: 'Offer ends in {duration}',
    offerDurationDay: '{count} day',
    offerDurationDays: '{count} days',
    offerDurationHour: '{count} hour',
    offerDurationHours: '{count} hours',
  };

  it('fills duration and leaves the surrounding copy', () => {
    expect(fillOfferEndsIn(copy, '2026-10-04T00:00:00.000Z', now)).toBe(
      'Offer ends in 3 days',
    );
  });

  it('returns null when the template or a future end is missing', () => {
    expect(
      fillOfferEndsIn(
        { ...copy, offerEndsIn: 'Offer ends soon' },
        '2026-10-04T00:00:00.000Z',
        now,
      ),
    ).toBeNull();

    expect(fillOfferEndsIn(copy, null, now)).toBeNull();
  });
});
