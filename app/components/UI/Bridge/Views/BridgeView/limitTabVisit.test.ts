import { BRIDGE_LIMIT_TAB_VISITED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';
import {
  hasVisitedLimitTab,
  markLimitTabVisited,
  subscribeToLimitTabVisited,
} from './limitTabVisit';

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItem: jest.fn(),
    onKeyChange: jest.fn(),
  },
}));

describe('limitTabVisit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(StorageWrapper.getItemSync).mockReturnValue(null);
    jest.mocked(StorageWrapper.setItem).mockResolvedValue(undefined);
  });

  it('reports a persisted Limit tab visit', () => {
    jest.mocked(StorageWrapper.getItemSync).mockReturnValue('true');

    const result = hasVisitedLimitTab();

    expect(result).toBe(true);
  });

  it('persists the first Limit tab visit', () => {
    markLimitTabVisited();

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      BRIDGE_LIMIT_TAB_VISITED,
      'true',
    );
  });

  it('does not rewrite a persisted Limit tab visit', () => {
    jest.mocked(StorageWrapper.getItemSync).mockReturnValue('true');

    markLimitTabVisited();

    expect(StorageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('notifies subscribers when the Limit tab is visited', () => {
    const listener = jest.fn();
    const unsubscribe = jest.fn();
    jest
      .mocked(StorageWrapper.onKeyChange)
      .mockImplementation((_key, callback) => {
        callback({
          key: BRIDGE_LIMIT_TAB_VISITED,
          value: 'true',
          action: 'set',
        });
        return unsubscribe;
      });

    const result = subscribeToLimitTabVisited(listener);

    expect(StorageWrapper.onKeyChange).toHaveBeenCalledWith(
      BRIDGE_LIMIT_TAB_VISITED,
      expect.any(Function),
    );
    expect(listener).toHaveBeenCalledWith(true);
    expect(result).toBe(unsubscribe);
  });
});
