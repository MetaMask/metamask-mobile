import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { looksLikeUrl, getSearchUrl, navigateToBrowser } from './search';

describe('looksLikeUrl', () => {
  it.each([
    'metamask.io',
    'http://metamask.io',
    'https://metamask.io',
    'metamask.io/portfolio',
    'metamask.io/portfolio?tab=nfts',
    'portfolio.metamask.io',
    'api.v2.metamask.io',
    'MetaMask.IO',
  ])('returns true for "%s"', (input) => {
    expect(looksLikeUrl(input.toLowerCase())).toBe(true);
  });

  it.each([
    'ethereum',
    'hello world',
    'ethereum blockchain',
    'localhost:3000',
    'test@#$%query',
    '',
  ])('returns false for "%s"', (input) => {
    expect(looksLikeUrl(input.toLowerCase())).toBe(false);
  });
});

describe('getSearchUrl', () => {
  it('returns a Google search URL by default', () => {
    expect(getSearchUrl('ethereum', 'Google')).toBe(
      'https://www.google.com/search?q=ethereum',
    );
  });

  it('returns a Google search URL when searchEngine is undefined', () => {
    expect(getSearchUrl('ethereum', undefined)).toBe(
      'https://www.google.com/search?q=ethereum',
    );
  });

  it('returns a DuckDuckGo search URL when selected', () => {
    expect(getSearchUrl('ethereum', 'DuckDuckGo')).toBe(
      'https://duckduckgo.com/?q=ethereum',
    );
  });

  it('encodes special characters', () => {
    expect(getSearchUrl('ethereum & bitcoin', 'Google')).toBe(
      'https://www.google.com/search?q=ethereum%20%26%20bitcoin',
    );
  });
});

describe('navigateToBrowser', () => {
  let mockNavigation: jest.Mocked<NavigationProp<ParamListBase>>;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    mockNavigation = {
      navigate: jest.fn(),
    } as unknown as jest.Mocked<NavigationProp<ParamListBase>>;

    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('navigates to browser with the given URL', () => {
    navigateToBrowser(mockNavigation, 'https://metamask.io');

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://metamask.io',
        timestamp: 1234567890,
        fromTrending: true,
      },
    });
  });
});
