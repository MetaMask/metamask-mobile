import migrate, { migrationVersion } from './120';

interface MockRewardsControllerState {
  activeAccount: null;
  accounts: Record<string, unknown>;
  snapshots?: Record<string, unknown>;
}

interface MockState {
  engine: {
    backgroundState: {
      NetworkController: Record<string, unknown>;
      RewardsController?: MockRewardsControllerState;
    };
  };
  rewards: Record<string, unknown>;
}

const createMockState = (
  rewardsOverrides?: Record<string, unknown>,
  controllerOverrides?: Partial<MockRewardsControllerState>,
): MockState => ({
  engine: {
    backgroundState: {
      NetworkController: {},
      ...(controllerOverrides && {
        RewardsController: {
          activeAccount: null,
          accounts: {},
          ...controllerOverrides,
        },
      }),
    },
  },
  rewards: {
    activeTab: 'overview',
    seasonId: 'test-season-id',
    balanceTotal: 1000,
    ...rewardsOverrides,
  },
});

describe(`Migration ${migrationVersion}`, () => {
  describe('migrate - rewards reducer state', () => {
    it('removes snapshots property from rewards state', () => {
      const state = createMockState({
        snapshots: [
          {
            id: 'snapshot-1',
            name: 'Test Snapshot',
            tokenAmount: '1000',
          },
        ],
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards).not.toHaveProperty('snapshots');
      expect(migratedState.rewards.activeTab).toBe('overview');
      expect(migratedState.rewards.seasonId).toBe('test-season-id');
    });

    it('removes snapshotsLoading property from rewards state', () => {
      const state = createMockState({
        snapshotsLoading: true,
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards).not.toHaveProperty('snapshotsLoading');
    });

    it('removes snapshotsError property from rewards state', () => {
      const state = createMockState({
        snapshotsError: true,
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards).not.toHaveProperty('snapshotsError');
    });

    it('removes all snapshot-related properties at once', () => {
      const state = createMockState({
        snapshots: [{ id: 'test' }],
        snapshotsLoading: false,
        snapshotsError: false,
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards).not.toHaveProperty('snapshots');
      expect(migratedState.rewards).not.toHaveProperty('snapshotsLoading');
      expect(migratedState.rewards).not.toHaveProperty('snapshotsError');
    });

    it('preserves other rewards state properties', () => {
      const state = createMockState({
        snapshots: [{ id: 'test' }],
        snapshotsLoading: true,
        snapshotsError: false,
        referralCode: 'ABC123',
        balanceTotal: 5000,
        currentTier: { id: 'gold', name: 'Gold' },
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards.activeTab).toBe('overview');
      expect(migratedState.rewards.seasonId).toBe('test-season-id');
      expect(migratedState.rewards.referralCode).toBe('ABC123');
      expect(migratedState.rewards.balanceTotal).toBe(5000);
      expect(migratedState.rewards.currentTier).toEqual({
        id: 'gold',
        name: 'Gold',
      });
    });

    it('returns state unchanged when rewards state does not exist', () => {
      const state = {
        engine: {
          backgroundState: {},
        },
      };

      const migratedState = migrate(state);

      expect(migratedState).toEqual(state);
    });

    it('returns state unchanged when snapshot properties do not exist', () => {
      const state = createMockState();

      const migratedState = migrate(state);

      expect(migratedState).toEqual(state);
    });

    it('returns state unchanged when state is invalid', () => {
      const invalidState = null;

      const result = migrate(invalidState);

      expect(result).toBeNull();
    });

    it('returns state unchanged when state is not an object', () => {
      const invalidState = 'invalid';

      const result = migrate(invalidState);

      expect(result).toBe('invalid');
    });

    it('handles snapshots being null', () => {
      const state = createMockState({
        snapshots: null,
        snapshotsLoading: false,
        snapshotsError: false,
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards).not.toHaveProperty('snapshots');
      expect(migratedState.rewards).not.toHaveProperty('snapshotsLoading');
      expect(migratedState.rewards).not.toHaveProperty('snapshotsError');
    });

    it('handles empty snapshots array', () => {
      const state = createMockState({
        snapshots: [],
        snapshotsLoading: false,
        snapshotsError: false,
      });

      const migratedState = migrate(state) as MockState;

      expect(migratedState.rewards).not.toHaveProperty('snapshots');
    });
  });

  describe('migrate - RewardsController state', () => {
    it('removes snapshots property from RewardsController state', () => {
      const state = createMockState(
        {},
        {
          snapshots: {
            'season-1': {
              snapshots: [{ id: 'snapshot-1', name: 'Test' }],
              lastFetched: Date.now(),
            },
          },
        },
      );

      const migratedState = migrate(state) as MockState;

      expect(
        migratedState.engine.backgroundState.RewardsController,
      ).not.toHaveProperty('snapshots');
    });

    it('preserves other RewardsController state properties', () => {
      const state = createMockState(
        {},
        {
          snapshots: {
            'season-1': {
              snapshots: [{ id: 'snapshot-1' }],
              lastFetched: Date.now(),
            },
          },
        },
      );

      const migratedState = migrate(state) as MockState;

      expect(
        migratedState.engine.backgroundState.RewardsController?.activeAccount,
      ).toBeNull();
      expect(
        migratedState.engine.backgroundState.RewardsController?.accounts,
      ).toEqual({});
    });

    it('handles missing RewardsController state', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {},
          },
        },
        rewards: {
          activeTab: 'overview',
        },
      };

      const migratedState = migrate(state);

      expect(migratedState).toEqual(state);
    });

    it('handles empty snapshots object in controller', () => {
      const state = createMockState(
        {},
        {
          snapshots: {},
        },
      );

      const migratedState = migrate(state) as MockState;

      expect(
        migratedState.engine.backgroundState.RewardsController,
      ).not.toHaveProperty('snapshots');
    });

    it('removes snapshots from both reducer and controller simultaneously', () => {
      const state = createMockState(
        {
          snapshots: [{ id: 'reducer-snapshot' }],
          snapshotsLoading: true,
          snapshotsError: false,
        },
        {
          snapshots: {
            'season-1': {
              snapshots: [{ id: 'controller-snapshot' }],
              lastFetched: Date.now(),
            },
          },
        },
      );

      const migratedState = migrate(state) as MockState;

      // Verify reducer state cleaned
      expect(migratedState.rewards).not.toHaveProperty('snapshots');
      expect(migratedState.rewards).not.toHaveProperty('snapshotsLoading');
      expect(migratedState.rewards).not.toHaveProperty('snapshotsError');

      // Verify controller state cleaned
      expect(
        migratedState.engine.backgroundState.RewardsController,
      ).not.toHaveProperty('snapshots');
    });
  });
});
