import migrate from './050';
import DefaultPreference from 'react-native-default-preference';
import StorageWrapper from '../storage-wrapper';

const defaultPreferenceItems: { [key: string]: string | null } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
  valueD: null,
};

jest.mock('../storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue(''),
}));
jest.mock('react-native-default-preference', () => ({
  set: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn().mockReturnValue(defaultPreferenceItems),
}));

describe('Migration #50', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('migrates default preferences values to mmkv and clears DefaultPreference', async () => {
    await migrate({});

    expect(StorageWrapper.setItem).toHaveBeenCalledTimes(3);
    expect(StorageWrapper.setItem).toHaveBeenCalledWith('valueA', 'a');
    expect(StorageWrapper.setItem).toHaveBeenCalledWith('valueB', 'true');
    expect(StorageWrapper.setItem).toHaveBeenCalledWith('valueC', 'myValue');

    expect(DefaultPreference.clear).toHaveBeenCalledTimes(4);
    expect(DefaultPreference.clear).toHaveBeenCalledWith('valueA');
    expect(DefaultPreference.clear).toHaveBeenCalledWith('valueB');
    expect(DefaultPreference.clear).toHaveBeenCalledWith('valueC');
    expect(DefaultPreference.clear).toHaveBeenCalledWith('valueD');
  });
});
