import handleBrowserUrl from '../handleBrowserUrl';
import { InteractionManager } from 'react-native';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => {
      callback();
    }),
  },
}));

describe('handleBrowserUrl', () => {
  const mockRunAfterInteractions =
    InteractionManager.runAfterInteractions as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls runAfterInteractions', () => {
    const callback = jest.fn();
    const testUrl = 'https://test.com';

    handleBrowserUrl({ url: testUrl, callback });

    expect(mockRunAfterInteractions).toHaveBeenCalledWith(expect.any(Function));
  });
});
