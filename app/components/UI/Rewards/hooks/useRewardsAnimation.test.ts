import { RewardAnimationState } from './useRewardsAnimation';

// Mock rive-react-native
jest.mock('rive-react-native', () => ({
  RiveRef: jest.fn(),
}));

describe('useRewardsAnimation', () => {
  describe('RewardAnimationState enum', () => {
    it('should have Loading state', () => {
      expect(RewardAnimationState.Loading).toBe('loading');
    });

    it('should have ErrorState state', () => {
      expect(RewardAnimationState.ErrorState).toBe('error');
    });

    it('should have Idle state', () => {
      expect(RewardAnimationState.Idle).toBe('idle');
    });

    it('should have exactly 3 states', () => {
      const states = Object.values(RewardAnimationState);
      expect(states).toHaveLength(3);
    });

    it('should have all expected state values', () => {
      const states = Object.values(RewardAnimationState);
      expect(states).toContain('loading');
      expect(states).toContain('error');
      expect(states).toContain('idle');
    });
  });

  describe('Hook exports', () => {
    it('should export useRewardsAnimation', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const exported = require('./useRewardsAnimation');
      expect(exported.useRewardsAnimation).toBeDefined();
      expect(typeof exported.useRewardsAnimation).toBe('function');
    });

    it('should export RewardAnimationState', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const exported = require('./useRewardsAnimation');
      expect(exported.RewardAnimationState).toBeDefined();
      expect(typeof exported.RewardAnimationState).toBe('object');
    });
  });

  describe('Module structure', () => {
    it('should be importable without errors', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        require('./useRewardsAnimation');
      }).not.toThrow();
    });

    it('should have correct enum structure', () => {
      expect(RewardAnimationState).toMatchObject({
        Loading: 'loading',
        ErrorState: 'error',
        Idle: 'idle',
      });
    });
  });
});
