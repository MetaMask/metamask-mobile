import { strings } from '../../../../../../../locales/i18n';

import { withdrawAnnouncement } from './withdrawAnnouncement';

describe('withdrawAnnouncement', () => {
  it('announces the stalled notice, which iOS never reads on its own', () => {
    expect(withdrawAnnouncement(null, true)).toBe(
      strings('predict_next.withdraw.status.stalled'),
    );
  });

  it('keeps the failure copy ahead of the stall', () => {
    expect(withdrawAnnouncement('We could not reach the venue.', true)).toBe(
      'We could not reach the venue.',
    );
  });

  it('announces nothing while the surface did not change', () => {
    expect(withdrawAnnouncement(null, false)).toBeNull();
  });
});
