import handleBrowserUrl from '../handleBrowserUrl';
import { InteractionManager } from 'react-native';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((fn) => {
      fn();
      return { done: jest.fn() };
    }),
  },
}));

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

describe('handleBrowserUrl', () => {
  const mockRunAfterInteractions =
    InteractionManager.runAfterInteractions as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    // Restore the mock implementation after clearing mocks
    mockRunAfterInteractions.mockImplementation((fn) => {
      fn();
      return { done: jest.fn() };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls runAfterInteractions', () => {
    const callback = jest.fn();
    const testUrl = 'https://test.com';

    handleBrowserUrl({ url: testUrl, callback });

    expect(mockRunAfterInteractions).toHaveBeenCalledWith(expect.any(Function));
  });

  it('invokes callback with URL when callback is provided', () => {
    const callback = jest.fn();
    const testUrl = 'https://example.com/page';

    handleBrowserUrl({ url: testUrl, callback });

    expect(callback).toHaveBeenCalledWith(testUrl);
    expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to BROWSER.VIEW when no callback is provided', () => {
    const testUrl = 'https://example.com/page';

    handleBrowserUrl({ url: testUrl });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.BROWSER.VIEW,
      {
        newTabUrl: testUrl,
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: 1234567890,
      },
    );
  });

  it('calls handle.done() when handle has done method', () => {
    const mockDone = jest.fn();
    mockRunAfterInteractions.mockImplementation((fn) => {
      fn();
      return { done: mockDone };
    });
    const testUrl = 'https://example.com';

    handleBrowserUrl({ url: testUrl });

    expect(mockDone).toHaveBeenCalled();
  });

  it('does not throw when handle.done is undefined', () => {
    mockRunAfterInteractions.mockImplementation((fn) => {
      fn();
      return {};
    });
    const testUrl = 'https://example.com';

    expect(() => handleBrowserUrl({ url: testUrl })).not.toThrow();
  });
});
