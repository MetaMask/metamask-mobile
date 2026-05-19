import { FlowPlayer } from '../flow-player';

describe('FlowPlayer', () => {
  describe('scaleCoords', () => {
    it('scales coordinates when screen sizes differ', () => {
      const scaled = FlowPlayer.scaleCoords(
        [540, 890],
        [1080, 2400],
        [1440, 3200],
      );
      expect(scaled).toEqual([720, 1187]);
    });

    it('returns same coords when screen sizes match', () => {
      const scaled = FlowPlayer.scaleCoords(
        [540, 890],
        [1080, 2400],
        [1080, 2400],
      );
      expect(scaled).toEqual([540, 890]);
    });
  });

  describe('loadFlow', () => {
    it('is a static method', () => {
      expect(typeof FlowPlayer.loadFlow).toBe('function');
    });
  });
});
