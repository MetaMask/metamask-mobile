import { SOCIAL_TAB_VISITED } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  hasVisitedSocialTab,
  markSocialTabVisited,
  subscribeToSocialTabVisited,
} from './socialTabVisit';

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItem: jest.fn(),
    onKeyChange: jest.fn(),
  },
}));

describe('socialTabVisit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(StorageWrapper.getItemSync).mockReturnValue(null);
    jest.mocked(StorageWrapper.setItem).mockResolvedValue(undefined);
  });

  it('reports a persisted Social visit', () => {
    jest.mocked(StorageWrapper.getItemSync).mockReturnValue('true');

    const result = hasVisitedSocialTab();

    expect(result).toBe(true);
  });

  it('persists the first Social visit', () => {
    markSocialTabVisited();

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      SOCIAL_TAB_VISITED,
      'true',
    );
  });

  it('does not rewrite a persisted Social visit', () => {
    jest.mocked(StorageWrapper.getItemSync).mockReturnValue('true');

    markSocialTabVisited();

    expect(StorageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('notifies subscribers when Social is visited', () => {
    const listener = jest.fn();
    const unsubscribe = jest.fn();
    jest
      .mocked(StorageWrapper.onKeyChange)
      .mockImplementation((_key, callback) => {
        callback({
          key: SOCIAL_TAB_VISITED,
          value: 'true',
          action: 'set',
        });
        return unsubscribe;
      });

    const result = subscribeToSocialTabVisited(listener);

    expect(StorageWrapper.onKeyChange).toHaveBeenCalledWith(
      SOCIAL_TAB_VISITED,
      expect.any(Function),
    );
    expect(listener).toHaveBeenCalledWith(true);
    expect(result).toBe(unsubscribe);
  });
});
