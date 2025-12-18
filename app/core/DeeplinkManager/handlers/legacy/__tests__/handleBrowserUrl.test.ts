import handleBrowserUrl from '../handleBrowserUrl';
import DeeplinkManager from '../../../DeeplinkManager';
import { InteractionManager } from 'react-native';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => {
      callback();
    }),
  },
}));

describe('handleBrowserUrl', () => {
  const mockNavigate = jest.fn();
  const mockRunAfterInteractions =
    InteractionManager.runAfterInteractions as jest.Mock;

  const deeplinkManager = {
    navigation: {
      navigate: mockNavigate,
    },
  } as unknown as DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call runAfterInteractions', () => {
    const callback = jest.fn();
    const testUrl = 'https://test.com';

    handleBrowserUrl({ deeplinkManager, url: testUrl, callback });

    expect(mockRunAfterInteractions).toHaveBeenCalledWith(expect.any(Function));
  });
});
