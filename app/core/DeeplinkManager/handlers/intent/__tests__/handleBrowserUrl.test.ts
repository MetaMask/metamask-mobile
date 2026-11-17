import handleBrowserUrl, {
  createBrowserDeeplinkIntent,
} from '../handleBrowserUrl';
import { InteractionManager } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';

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

  it('creates a browser tab startup intent', () => {
    const intent = createBrowserDeeplinkIntent({
      url: 'https://test.com',
    });

    expect(intent).toEqual({
      target: {
        type: 'home-tab',
        routeName: Routes.BROWSER.HOME,
        params: {
          screen: Routes.BROWSER.VIEW,
          params: {
            newTabUrl: 'https://test.com',
            linkType: EXTERNAL_LINK_TYPE,
            timestamp: expect.any(Number),
          },
        },
      },
    });
  });
});
