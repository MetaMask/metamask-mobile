import StorageWrapper from '../../../../../store/storage-wrapper';
import {
  hasViewedVbaAccountDetails,
  markVbaAccountDetailsViewed,
  subscribeVbaAccountDetailsViewed,
} from './vbaAccountDetailsViewedStorage';

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockStorage = jest.mocked(StorageWrapper);

describe('VBA account details viewed storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  it('stores the flag under a normalized wallet key', async () => {
    await markVbaAccountDetailsViewed('0xAbC');

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      '@MetaMask:vbaAccountDetailsViewed:v1:0xabc',
      'true',
    );
  });

  it('reads the flag for a normalized wallet key', async () => {
    mockStorage.getItem.mockResolvedValue('true');

    await expect(hasViewedVbaAccountDetails('0xAbC')).resolves.toBe(true);
    expect(mockStorage.getItem).toHaveBeenCalledWith(
      '@MetaMask:vbaAccountDetailsViewed:v1:0xabc',
    );
  });

  it('reports not viewed when nothing or something unexpected is stored', async () => {
    await expect(hasViewedVbaAccountDetails('0xabc')).resolves.toBe(false);

    mockStorage.getItem.mockResolvedValue('nope');
    await expect(hasViewedVbaAccountDetails('0xabc')).resolves.toBe(false);
  });

  it('notifies subscribers with the normalized wallet after saving', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeVbaAccountDetailsViewed(listener);

    await markVbaAccountDetailsViewed('0xAbC');
    expect(listener).toHaveBeenCalledWith('0xabc');

    unsubscribe();
    await markVbaAccountDetailsViewed('0xAbC');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify subscribers when saving fails', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('disk full'));
    const listener = jest.fn();
    const unsubscribe = subscribeVbaAccountDetailsViewed(listener);

    await expect(markVbaAccountDetailsViewed('0xabc')).rejects.toThrow(
      'disk full',
    );
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
