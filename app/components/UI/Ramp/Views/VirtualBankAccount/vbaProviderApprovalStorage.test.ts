import StorageWrapper from '../../../../../store/storage-wrapper';
import {
  clearVbaProviderApprovalPending,
  isVbaProviderApprovalPending,
  markVbaProviderApprovalPending,
} from './vbaProviderApprovalStorage';

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockStorage = jest.mocked(StorageWrapper);

const STORAGE_KEY = '@MetaMask:vbaProviderApprovalPending:v1:0xabc';

describe('VBA provider approval storage', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new Map();
    mockStorage.getItem.mockImplementation(
      async (key: string) => store.get(key) ?? null,
    );
    mockStorage.setItem.mockImplementation(
      async (key: string, value: string) => {
        store.set(key, value);
      },
    );
    mockStorage.removeItem.mockImplementation(async (key: string) => {
      store.delete(key);
    });
  });

  it('reports not pending when nothing is stored', async () => {
    await expect(isVbaProviderApprovalPending('0xAbC')).resolves.toBe(false);
  });

  it('stores the flag under a lowercased wallet key and reads it back', async () => {
    await markVbaProviderApprovalPending('0xAbC');

    expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true');
    await expect(isVbaProviderApprovalPending('0xABC')).resolves.toBe(true);
    await expect(isVbaProviderApprovalPending('0xdef')).resolves.toBe(false);
  });

  it('reports not pending after clearing', async () => {
    await markVbaProviderApprovalPending('0xAbC');

    await clearVbaProviderApprovalPending('0xabc');

    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    await expect(isVbaProviderApprovalPending('0xAbC')).resolves.toBe(false);
  });
});
