import { migrations, version } from './migrations';

describe('Redux Persist Migrations', () => {
  it('should apply migration number 19 and return state', () => {
    let currentState = {};

    const migration = migrations[19];

    currentState = migration(currentState);

    expect(currentState).toBeDefined(); // Ensure state is defined after the migration
  });
  it('should have all migrations up to the latest version', () => {
    // Assert that the latest migration index matches the version constant
    expect(Object.keys(migrations).length - 1).toBe(version);
  });
});
