import { cloneDeep } from 'lodash';
import { migrations, version } from './migrations';

describe('Redux Persist Migrations', () => {
  it('should have all migrations up to the latest version', () => {
    // Assert that the latest migration index matches the version constant
    expect(Object.keys(migrations).length - 1).toBe(version);
  });

  it('should apply last migration version and return state', () => {
    // update this state to be compatible with the most recent migration
    const oldState = {
      user: {
        nftDetectionDismissed: true,
      },
      engine: {
        backgroundState: { PreferencesController: { openSeaEnabled: true } },
      },
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
    it('shouldDisplayNftMedia have the same value as openSeaEnabled and delete openSeaEnabled property and delete nftDetectionDismissed', () => {
      const oldState = {
        user: { nftDetectionDismissed: true },
        engine: {
          backgroundState: { PreferencesController: { openSeaEnabled: true } },
        },
      };

      const migration = migrations[20];

      const newState = migration(oldState);

      expect(newState).toStrictEqual({
        user: {},
        engine: {
          backgroundState: { PreferencesController: { displayNftMedia: true } },
        },
      });
    });
  });
});
