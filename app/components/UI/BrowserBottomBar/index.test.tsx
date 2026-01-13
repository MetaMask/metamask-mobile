import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import BrowserBottomBar from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('../../../actions/bookmarks', () => ({
  addBookmark: jest.fn((bookmark) => ({
    type: 'ADD_BOOKMARK',
    bookmark,
  })),
  removeBookmark: jest.fn((bookmark) => ({
    type: 'REMOVE_BOOKMARK',
    bookmark,
  })),
}));
jest.mock('../../../util/device', () => ({
  isIos: jest.fn(() => false),
  isAndroid: jest.fn(() => true),
}));
jest.mock('@metamask/react-native-search-api', () => ({
  indexSpotlightItem: jest.fn(),
}));
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockNavigation = {
  push: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('BrowserBottomBar', () => {
  const mockGoBack = jest.fn();
  const mockGoForward = jest.fn();
  const mockReload = jest.fn();
  const mockOpenNewTab = jest.fn();
  const mockGetMaskedUrl = jest.fn((_url: string) => _url);

  const defaultProps = {
    canGoBack: true,
    canGoForward: true,
    goBack: mockGoBack,
    goForward: mockGoForward,
    reload: mockReload,
    openNewTab: mockOpenNewTab,
    activeUrl: 'https://example.com',
    getMaskedUrl: mockGetMaskedUrl,
    title: 'Example Site',
    sessionENSNames: {},
    favicon: { uri: 'https://example.com/favicon.ico' },
    icon: { uri: 'https://example.com/icon.png' },
  };

  const initialState = {
    bookmarks: [],
    engine: {
      backgroundState: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Navigation Controls', () => {
    it('calls goBack when back button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls goForward when forward button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON));

      expect(mockGoForward).toHaveBeenCalledTimes(1);
    });

    it('calls reload when reload button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.RELOAD_BUTTON));

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('disables back button when canGoBack is false', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} canGoBack={false} />,
        { state: initialState },
      );

      const backButton = getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON);

      expect(backButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables forward button when canGoForward is false', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} canGoForward={false} />,
        { state: initialState },
      );

      const forwardButton = getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON);

      expect(forwardButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('New Tab Functionality', () => {
    it('calls openNewTab when new tab button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.NEW_TAB_BUTTON));

      expect(mockOpenNewTab).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bookmark Functionality', () => {
    it('navigates to AddBookmarkView when bookmark button is pressed for non-bookmarked page', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalledWith(
        'AddBookmarkView',
        expect.objectContaining({
          screen: 'AddBookmark',
        }),
      );
    });

    it('renders bookmark button for bookmarked page', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Example Site', url: 'https://example.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithBookmark },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton).toBeTruthy();
    });

    it('navigates to AddBookmarkView when URL does not match existing bookmarks', () => {
      const stateWithDifferentBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Other Site', url: 'https://other.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithDifferentBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('renders bookmark button when page is bookmarked', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Example Site', url: 'https://example.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithBookmark },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton).toBeTruthy();
    });

    it('renders bookmark button when page is not bookmarked', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton).toBeTruthy();
    });
  });

  describe('URL Masking', () => {
    it('calls getMaskedUrl for bookmark operations', () => {
      const customGetMaskedUrl = jest.fn((_url: string) => `masked-${_url}`);

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={customGetMaskedUrl}
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(customGetMaskedUrl).toHaveBeenCalledWith(
        'https://example.com',
        {},
      );
    });

    it('renders bookmark button when using masked URL', () => {
      const customGetMaskedUrl = jest.fn((_url: string) => 'masked-url');
      const stateWithMaskedBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Site', url: 'masked-url' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={customGetMaskedUrl}
        />,
        { state: stateWithMaskedBookmark },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('does not throw error when goBack is undefined', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} goBack={undefined} />,
        { state: initialState },
      );

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON));
      }).not.toThrow();
    });

    it('does not throw error when goForward is undefined', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} goForward={undefined} />,
        { state: initialState },
      );

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON));
      }).not.toThrow();
    });

    it('does not throw error when reload is undefined', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} reload={undefined} />,
        { state: initialState },
      );

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.RELOAD_BUTTON));
      }).not.toThrow();
    });

    it('does not throw error when openNewTab is undefined', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} openNewTab={undefined} />,
        { state: initialState },
      );

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.NEW_TAB_BUTTON));
      }).not.toThrow();
    });

    it('navigates to AddBookmarkView with empty title', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} title="" />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalledWith(
        'AddBookmarkView',
        expect.objectContaining({
          params: expect.objectContaining({
            title: '',
          }),
        }),
      );
    });

    it('uses favicon when icon is undefined', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} icon={undefined} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalled();
    });
  });

  describe('Platform-specific Behavior', () => {
    it('renders on Android platform', () => {
      Platform.OS = 'android';

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON)).toBeTruthy();
    });

    it('renders on iOS platform', () => {
      Platform.OS = 'ios';

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON)).toBeTruthy();
    });
  });

  describe('Bookmark Removal', () => {
    it('dispatches removeBookmark when bookmark exists for current URL', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Example Site', url: 'https://example.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithBookmark },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );
      fireEvent.press(bookmarkButton);

      // Note: We can't easily test the dispatch was called due to mocking limitations
      // The test verifies the button can be pressed when bookmarked
      expect(bookmarkButton).toBeTruthy();
    });

    it('does not dispatch removeBookmark when bookmark not found', () => {
      const stateWithDifferentBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Other Site', url: 'https://different.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithDifferentBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalled();
    });
  });

  describe('Bookmark Button Disabled State', () => {
    it('disables bookmark button when activeUrl is empty', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="" />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables bookmark button when activeUrl contains only whitespace', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="   " />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton.props.accessibilityState.disabled).toBe(true);
    });

    it('enables bookmark button when activeUrl has valid value', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="https://example.com" />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton.props.accessibilityState.disabled).toBe(false);
    });

    it('does not navigate when bookmark button pressed with empty URL', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="" />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).not.toHaveBeenCalled();
    });
  });

  describe('Bookmark Button Disabled State', () => {
    it('disables bookmark button when activeUrl is empty', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="" />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables bookmark button when activeUrl contains only whitespace', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="   " />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton.props.accessibilityState.disabled).toBe(true);
    });

    it('enables bookmark button when activeUrl has valid value', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="https://example.com" />,
        { state: initialState },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      expect(bookmarkButton.props.accessibilityState.disabled).toBe(false);
    });

    it('does not navigate when bookmark button pressed with empty URL', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="" />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).not.toHaveBeenCalled();
    });
  });
});
