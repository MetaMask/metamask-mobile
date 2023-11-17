import { migrate, version } from './019';

describe('#19', () => {
  it('should update the version metadata', async () => {
    const oldStorage = {
      meta: {version: version - 1},
      data: {},
    };

    const newStorage = await migrate(oldStorage);
    expect(newStorage.meta).toStrictEqual({version});
  });
  
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
