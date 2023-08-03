import { cloneDeep } from 'lodash';
import { migrations, version } from './migrations';
import initialBackgroundState from '../util/test/initial-background-state.json';
import { IPFS_DEFAULT_GATEWAY_URL } from '../../app/constants/network';

describe('Redux Persist Migrations', () => {
  it('should have all migrations up to the latest version', () => {
    // Assert that the latest migration index matches the version constant
    expect(Object.keys(migrations).length - 1).toBe(version);
  });

  it('should apply last migration version and return state', () => {
    // update this state to be compatible with the most recent migration
    const oldState = {
      recents: '0x1',
    };

    const migration = migrations[version];

    const newState = migration(oldState);

    expect(newState).toBeDefined();
  });

  describe('#19', () => {
    it('should not change state if recents are missing', () => {
      const oldState = {
        foo: 'bar',
      };

      const migration = migrations[19];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });

    it('should remove recents', () => {
      const oldState = {
        recents: '0x1',
      };

      const migration = migrations[19];

      const newState = migration(oldState);

      expect(newState).toStrictEqual({});
    });
  });

  describe('#20', () => {
    it('should not change state if ipfs gateway in use is not outdated', () => {
      const currentState = {
        engine: {
          backgroundState: initialBackgroundState,
        },
      };

      const migration = migrations[20];

      const newState = migration(currentState);

      expect(newState).toStrictEqual(currentState);
    });

    it('should change outdated ipfs gateway to default one', () => {
      const stateWithIpfsGateway = (ipfsGateway) => ({
        engine: {
          backgroundState: {
            ...initialBackgroundState,
            PreferencesController: {
              ...initialBackgroundState.PreferencesController,
              ipfsGateway,
            },
          },
        },
      });

      // State with outdated ipfs gateway
      const currentState = stateWithIpfsGateway('https://hardbin.com/ipfs/');

      // State with default ipfs gateway
      const newStateExpectation = stateWithIpfsGateway(
        IPFS_DEFAULT_GATEWAY_URL,
      );

      const migration = migrations[20];
      const newState = migration(currentState);
      expect(newState).toStrictEqual(newStateExpectation);
    });
  });
});
