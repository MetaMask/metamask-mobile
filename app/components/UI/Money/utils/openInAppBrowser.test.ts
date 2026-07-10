import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { openInAppBrowser } from './openInAppBrowser';

describe('openInAppBrowser', () => {
  const createMockNavigation = () =>
    ({ navigate: jest.fn() }) as unknown as AppNavigationProp;

  it('navigates to the in-app browser with the given URL as a new tab', () => {
    const navigation = createMockNavigation();

    openInAppBrowser(navigation, 'https://example.com');

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://example.com',
        timestamp: expect.any(Number),
        fromMoney: true,
      },
    });
  });
});
