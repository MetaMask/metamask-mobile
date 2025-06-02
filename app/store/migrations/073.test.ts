import migrate from './073';

describe('Migration 73', () => {
  it('returns state unchanged', () => {
    const state = { some: 'state' };

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
  });
});
