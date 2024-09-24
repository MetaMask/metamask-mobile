import migrate from './019';

describe('Migration #19', () => {
  it('should not change state if recents are missing', () => {
    const oldState = {
      foo: 'bar',
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(oldState);
  });

  it('should remove recents', () => {
    const oldState = {
      recents: '0x1',
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual({});
  });
});
