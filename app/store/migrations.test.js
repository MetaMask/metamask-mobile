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
      engine: {
        backgroundState: {
          TransactionController: {
            transaction: [
              {
                transactionHash: '0x123',
                otherProperty: 'otherValue',
              },
              {
                transactionHash: '0x456',
                otherProperty: 'otherValue',
              },
            ],
          },
        },
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
    it('should rename transactionHash to hash', () => {
      const oldState = {
        engine: {
          backgroundState: {
            TransactionController: {
              transaction: [
                {
                  transactionHash: '0x123',
                  otherProperty: 'otherValue',
                },
                {
                  transactionHash: '0x456',
                  otherProperty: 'otherValue',
                },
              ],
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      const expectedState = {
        engine: {
          backgroundState: {
            TransactionController: {
              transaction: [
                {
                  hash: '0x123',
                  otherProperty: 'otherValue',
                },
                {
                  hash: '0x456',
                  otherProperty: 'otherValue',
                },
              ],
            },
          },
        },
      };

      expect(newState).toStrictEqual(expectedState);
    });

    it('should not change state if transactionHash is missing', () => {
      const oldState = {
        engine: {
          backgroundState: {
            TransactionController: {
              transaction: [
                {
                  hash: '0x456',
                },
              ],
            },
          },
        },
      };

      const migration = migrations[20];

      const newState = migration(cloneDeep(oldState));

      expect(newState).toStrictEqual(oldState);
    });
  });
});
