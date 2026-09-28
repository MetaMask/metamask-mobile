import axios from 'axios';
import ReadOnlyNetworkStore from './network-store';

jest.mock('axios', () => ({
  defaults: { headers: { common: {} } },
  get: jest.fn(),
}));

describe('ReadOnlyNetworkStore', () => {
  it('does not reach for the fixture server under Jest', async () => {
    // There is no fixture server in unit/view runs, so every request would sit
    // until its timeout and keep the test file's module registry alive.
    const state = await ReadOnlyNetworkStore.getState();

    expect(axios.get).not.toHaveBeenCalled();
    expect(state).toBeUndefined();
  });

  it('behaves as an empty store', async () => {
    const keys = await ReadOnlyNetworkStore.getAllKeys();

    expect(keys).toStrictEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });
});
