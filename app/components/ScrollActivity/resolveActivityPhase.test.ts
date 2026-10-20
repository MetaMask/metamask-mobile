import { activityMarginForHardwareTier } from './resolveActivityPhase';
import { resolveActivityPhase } from './index';
import type { ActivityPhase, ActivityPhaseInput } from './types';

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'LOW'),
}));

const VIEWPORT_HEIGHT = 200;

function resolve(
  overrides: Pick<
    ActivityPhaseInput,
    'slotTop' | 'slotHeight' | 'margin' | 'currentPhase'
  > &
    Partial<Pick<ActivityPhaseInput, 'scrollY' | 'viewportHeight'>>,
): ActivityPhase {
  return resolveActivityPhase({
    scrollY: 0,
    viewportHeight: VIEWPORT_HEIGHT,
    ...overrides,
  });
}

describe('activityMarginForHardwareTier', () => {
  it('returns 0 for LOW', () => {
    const margin = activityMarginForHardwareTier('LOW', VIEWPORT_HEIGHT);

    expect(margin).toBe(0);
  });

  it('returns half a viewport for MID', () => {
    const margin = activityMarginForHardwareTier('MID', VIEWPORT_HEIGHT);

    expect(margin).toBe(100);
  });

  it('returns half a viewport for null', () => {
    const margin = activityMarginForHardwareTier(null, VIEWPORT_HEIGHT);

    expect(margin).toBe(100);
  });

  it('returns one viewport for HIGH', () => {
    const margin = activityMarginForHardwareTier('HIGH', VIEWPORT_HEIGHT);

    expect(margin).toBe(200);
  });
});

describe('resolveActivityPhase', () => {
  it.each<[string, ActivityPhaseInput, ActivityPhase]>([
    [
      'active when the slot intersects the viewport',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 150,
        slotHeight: 80,
        margin: 0,
        currentPhase: null,
      },
      'active',
    ],
    [
      'dormant for a LOW margin of 0 when the slot is outside the viewport',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 200,
        slotHeight: 50,
        margin: 0,
        currentPhase: null,
      },
      'dormant',
    ],
    [
      'paused for a MID margin of half a viewport',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 200,
        slotHeight: 50,
        margin: 100,
        currentPhase: null,
      },
      'paused',
    ],
    [
      'paused for a null-tier margin of half a viewport',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 200,
        slotHeight: 50,
        margin: 100,
        currentPhase: null,
      },
      'paused',
    ],
    [
      'paused for a HIGH margin of one viewport',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 350,
        slotHeight: 40,
        margin: 200,
        currentPhase: null,
      },
      'paused',
    ],
    [
      'dormant for a MID margin when the slot is outside that margin',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 350,
        slotHeight: 40,
        margin: 100,
        currentPhase: null,
      },
      'dormant',
    ],
    [
      'dormant for a HIGH margin when the slot is outside that margin',
      {
        scrollY: 0,
        viewportHeight: VIEWPORT_HEIGHT,
        slotTop: 400,
        slotHeight: 40,
        margin: 200,
        currentPhase: null,
      },
      'dormant',
    ],
  ])('returns %s', (_label, input, expected) => {
    const result = resolveActivityPhase(input);

    expect(result).toBe(expected);
  });

  it('stays active until the slot passes the viewport edge by 32dp', () => {
    const justOutside = resolve({
      slotTop: 231,
      slotHeight: 20,
      margin: 0,
      currentPhase: 'active',
    });
    const pastHysteresis = resolve({
      slotTop: 232,
      slotHeight: 20,
      margin: 0,
      currentPhase: 'active',
    });

    expect(justOutside).toBe('active');
    expect(pastHysteresis).toBe('dormant');
  });

  it('becomes paused after leaving the viewport by 32dp when the margin still covers the slot', () => {
    const result = resolve({
      slotTop: 232,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'active',
    });

    expect(result).toBe('paused');
  });

  it('stays paused until the slot passes the margin edge by 32dp', () => {
    const justOutside = resolve({
      slotTop: 331,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'paused',
    });
    const pastHysteresis = resolve({
      slotTop: 332,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'paused',
    });

    expect(justOutside).toBe('paused');
    expect(pastHysteresis).toBe('dormant');
  });

  it('re-enters active on the raw viewport boundary', () => {
    const outside = resolve({
      slotTop: 200,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'paused',
    });
    const entering = resolve({
      slotTop: 199,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'paused',
    });

    expect(outside).toBe('paused');
    expect(entering).toBe('active');
  });

  it('re-enters paused on the raw margin boundary', () => {
    const outside = resolve({
      slotTop: 300,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'dormant',
    });
    const entering = resolve({
      slotTop: 299,
      slotHeight: 20,
      margin: 100,
      currentPhase: 'dormant',
    });

    expect(outside).toBe('dormant');
    expect(entering).toBe('paused');
  });

  it('stays active while the slot above the viewport is still within 32dp', () => {
    const result = resolveActivityPhase({
      scrollY: 100,
      viewportHeight: VIEWPORT_HEIGHT,
      slotTop: 40,
      slotHeight: 30,
      margin: 0,
      currentPhase: 'active',
    });

    expect(result).toBe('active');
  });
});
