import {
  PACK_HERO_FLIGHT,
  packFlightTransform,
  packFloatMatrix,
} from './PackHeroFlight.geometry';
import { parsePackPresentationPose } from '../CollectiblesMotion/CollectiblesMotion.types';

describe('Replit shared foil handoff', () => {
  it('preserves the authored 240ms shared clock and cubic bezier', () => {
    expect(PACK_HERO_FLIGHT).toEqual({
      duration: 240,
      easing: [0.2, 0.8, 0.2, 1],
    });
  });
  it('maps the measured source carrier onto the measured destination without a screen push', () => {
    expect(
      packFlightTransform(
        { left: 20, top: 150, width: 120, height: 200 },
        { left: 60, top: 100, width: 180, height: 300 },
      ),
    ).toEqual({ translateX: 40, translateY: -50, scaleX: 1.5, scaleY: 1.5 });
  });
  it('preserves the CSS float transform in native column-major coordinates', () => {
    expect(packFloatMatrix('matrix(1, 0, 0, 1, 0, -5)')).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -5, 0, 1,
    ]);
    expect(
      packFloatMatrix('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,-5,0,1)'),
    ).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -5, 0, 1]);
    expect(packFloatMatrix('invalid')).toBeUndefined();
  });
  it('accepts presentation poses and rejects injected commands or malformed transforms', () => {
    expect(
      parsePackPresentationPose(
        JSON.stringify({
          type: 'packPress',
          transform: 'matrix(1, 0, 0, 1, 0, -5)',
          time: 200,
        }),
      ),
    ).toEqual({ transform: 'matrix(1, 0, 0, 1, 0, -5)', time: 200 });
    expect(
      parsePackPresentationPose(
        JSON.stringify({ type: 'buy', transform: 'none', time: 0 }),
      ),
    ).toBeUndefined();
    expect(
      parsePackPresentationPose(
        JSON.stringify({
          type: 'packPress',
          transform: 'not-a-transform',
          time: 0,
        }),
      ),
    ).toBeUndefined();
  });
});
