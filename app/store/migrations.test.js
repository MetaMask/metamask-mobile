import { migrations, version } from './migrations';

describe('Redux Persist Migrations', () => {
  it('should apply last migration version and return state', () => {
    const oldState = {
      recents: '0x1',
    };

    const migration = migrations[version];

    const newState = migration(oldState);

    expect(newState).toBeDefined();
    expect(newState.recents).toBeUndefined();
  });
  it('should have all migrations up to the latest version', () => {
    // Assert that the latest migration index matches the version constant
    expect(Object.keys(migrations).length - 1).toBe(version);
  });
});
