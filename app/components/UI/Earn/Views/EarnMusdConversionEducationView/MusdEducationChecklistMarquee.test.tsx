import { shouldScrollMusdEducationTags } from './MusdEducationChecklistMarquee';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../util/deviceCapability/types';

describe('shouldScrollMusdEducationTags', () => {
  const tiers: NetworkTier[] = [
    'NONE',
    'SLOW_CELLULAR',
    'FAST_CELLULAR',
    'WIFI',
    null,
  ];

  it.each(tiers)(
    'scrolls on %s when hardware is not low and motion is allowed',
    (networkTier) => {
      const hardwareTier: HardwareTier = 'HIGH';

      expect(
        shouldScrollMusdEducationTags(hardwareTier, networkTier, false),
      ).toBe(true);
    },
  );

  it.each(tiers)(
    'keeps tags still on %s when hardware is low',
    (networkTier) => {
      expect(shouldScrollMusdEducationTags('LOW', networkTier, false)).toBe(
        false,
      );
    },
  );

  it('keeps tags still when reduced motion is on', () => {
    expect(shouldScrollMusdEducationTags('HIGH', 'WIFI', true)).toBe(false);
  });

  it('scrolls when the hardware tier is unknown', () => {
    expect(shouldScrollMusdEducationTags(null, null, false)).toBe(true);
  });
});
