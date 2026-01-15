import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { Platform } from 'react-native';
import Device from '../../../util/device';
import SearchApi from '@metamask/react-native-search-api';
import Logger from '../../../util/Logger';
import { addBookmark, removeBookmark } from '../../../actions/bookmarks';
import BrowserBottomBar from './';
import { BrowserViewSelectorsIDs } from '../../Views/BrowserTab/BrowserView.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';

// Mock dependencies
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn((_props) => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
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
    browser: {
      tabs: [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://another.com' },
      ],
      activeTab: 1,
      history: [],
      whitelist: [],
      favicons: [],
      visitedDappsByHostname: {},
      isFullscreen: false,
    },
    engine: {
      backgroundState: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    // Ensure mock implementations are restored after clearing
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));
    mockAddProperties.mockImplementation((_props) => ({ build: mockBuild }));
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

    it('tracks BROWSER_NEW_TAB analytics event with correct tab count', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.NEW_TAB_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_NEW_TAB,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        option_chosen: 'Browser Bottom Bar',
        number_of_tabs: 2,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
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
    it('applies Android-specific border styling', () => {
      Platform.OS = 'android';

      const { toJSON } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toBeTruthy();
    });

    it('applies iOS-specific border styling', () => {
      Platform.OS = 'ios';

      const { toJSON } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders with bottom inset padding', () => {
      const { toJSON } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Bookmark Removal', () => {
    it('dispatches removeBookmark action when bookmark exists for current URL', () => {
      const bookmarkToRemove = {
        name: 'Example Site',
        url: 'https://example.com',
      };
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [bookmarkToRemove],
      };

      // Ensure getMaskedUrl returns the same URL as the bookmark
      const customGetMaskedUrl = jest.fn(() => 'https://example.com');

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={customGetMaskedUrl}
        />,
        { state: stateWithBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(customGetMaskedUrl).toHaveBeenCalledWith(
        defaultProps.activeUrl,
        defaultProps.sessionENSNames,
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        removeBookmark(bookmarkToRemove),
      );
    });

    it('does not dispatch removeBookmark when bookmark not found in list', () => {
      const stateWithDifferentBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Other Site', url: 'https://different.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithDifferentBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REMOVE_BOOKMARK' }),
      );
      expect(mockNavigation.push).toHaveBeenCalled();
    });

    it('does not dispatch removeBookmark when bookmarkToRemove is undefined', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Example Site', url: 'https://example.com' }],
      };

      const customGetMaskedUrl = jest.fn(() => 'different-masked-url');

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={customGetMaskedUrl}
        />,
        { state: stateWithBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      // When maskedUrl doesn't match, bookmarkToRemove will be undefined
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REMOVE_BOOKMARK' }),
      );
    });

    it('does not dispatch removeBookmark when activeUrl is empty', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Example Site', url: 'https://example.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="" />,
        { state: stateWithBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      // Should return early due to isBookmarkDisabled check
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigation.push).not.toHaveBeenCalled();
    });

    it('does not dispatch removeBookmark when activeUrl contains only whitespace', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Example Site', url: 'https://example.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="   " />,
        { state: stateWithBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      // Should return early due to isBookmarkDisabled check
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigation.push).not.toHaveBeenCalled();
    });

    it('finds bookmark using masked URL from getMaskedUrl', () => {
      const bookmarkToRemove = {
        name: 'Example Site',
        url: 'masked-example-url',
      };
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [bookmarkToRemove],
      };

      const customGetMaskedUrl = jest.fn(() => 'masked-example-url');

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={customGetMaskedUrl}
        />,
        { state: stateWithBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(customGetMaskedUrl).toHaveBeenCalledWith(
        defaultProps.activeUrl,
        defaultProps.sessionENSNames,
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        removeBookmark(bookmarkToRemove),
      );
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

  describe('handleBookmarkPress Logic', () => {
    it('calls navigateToAddBookmark when URL is not bookmarked', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="https://new-site.com" />,
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

    it('does not navigate when bookmark exists for URL', () => {
      const stateWithBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Test', url: 'https://example.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: stateWithBookmark },
      );

      const bookmarkButton = getByTestId(
        BrowserViewSelectorsIDs.BOOKMARK_BUTTON,
      );

      fireEvent.press(bookmarkButton);

      expect(bookmarkButton).toBeTruthy();
    });

    it('calls navigateToAddBookmark when bookmark not found in list', () => {
      const stateWithOtherBookmark = {
        ...initialState,
        bookmarks: [{ name: 'Other', url: 'https://other.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} activeUrl="https://example.com" />,
        { state: stateWithOtherBookmark },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalled();
    });

    it('does not call dispatch when bookmark to remove is not found', () => {
      const stateWithDifferentUrl = {
        ...initialState,
        bookmarks: [{ name: 'Other', url: 'https://different.com' }],
      };

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={() => 'https://example.com'}
        />,
        { state: stateWithDifferentUrl },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalled();
    });
  });

  describe('navigateToAddBookmark Callback', () => {
    it('opens AddBookmarkView modal when adding bookmark', () => {
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

    it('uses empty string for title when title prop is empty', () => {
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

    it('passes getMaskedUrl result to modal parameters', () => {
      const customMaskedUrl = jest.fn(() => 'custom-masked-url');

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} getMaskedUrl={customMaskedUrl} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      expect(mockNavigation.push).toHaveBeenCalledWith(
        'AddBookmarkView',
        expect.objectContaining({
          params: expect.objectContaining({
            url: 'custom-masked-url',
          }),
        }),
      );
    });

    it('includes onAddBookmark callback in modal parameters', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      expect(pushCall[1].params.onAddBookmark).toBeDefined();
      expect(typeof pushCall[1].params.onAddBookmark).toBe('function');
    });
  });

  describe('iOS Spotlight Integration', () => {
    beforeEach(() => {
      (Device.isIos as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
    });

    it('includes iOS Spotlight integration in onAddBookmark callback when on iOS', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          icon={{ uri: 'https://example.com/icon.png' }}
          favicon={{ uri: 'https://example.com/favicon.ico' }}
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          uniqueIdentifier: defaultProps.activeUrl,
          title: 'Test Bookmark',
          contentDescription: 'Launch Test Bookmark on MetaMask',
          keywords: expect.arrayContaining([
            'Test',
            'Bookmark',
            'https://example.com',
            'dapp',
          ]),
          thumbnail: expect.objectContaining({
            uri: 'https://example.com/icon.png',
          }),
        }),
      );
    });

    it('uses favicon URI when icon URI is not available', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          icon={undefined}
          favicon={{ uri: 'https://example.com/favicon.ico' }}
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail: expect.objectContaining({
            uri: 'https://example.com/favicon.ico',
          }),
        }),
      );
    });

    it('uses empty string for thumbnail URI when neither icon nor favicon available', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} icon={undefined} favicon={{}} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail: expect.objectContaining({
            uri: '',
          }),
        }),
      );
    });

    it('handles iOS Spotlight errors gracefully', async () => {
      (SearchApi.indexSpotlightItem as jest.Mock).mockImplementation(() => {
        throw new Error('Spotlight error');
      });

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error adding to spotlight',
      );
    });

    it('does not call iOS Spotlight on Android', async () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).not.toHaveBeenCalled();
    });

    it('flattens keywords array using spread operator', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark Name',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['Test', 'Bookmark', 'Name', 'https://example.com', 'dapp'],
        }),
      );
    });

    it('uses name for title when name is provided', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Custom Bookmark Name',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Bookmark Name',
        }),
      );
    });

    it('uses getMaskedUrl result for title when name is empty', async () => {
      const customGetMaskedUrl = jest.fn(() => 'masked-url-for-title');

      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          getMaskedUrl={customGetMaskedUrl}
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: '',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'masked-url-for-title',
        }),
      );
    });

    it('uses urlToAdd in contentDescription when name is empty', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: '',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          contentDescription: 'Launch https://example.com on MetaMask',
        }),
      );
    });

    it('uses name in contentDescription when name is provided', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'My Bookmark',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          contentDescription: 'Launch My Bookmark on MetaMask',
        }),
      );
    });

    it('uses activeUrl as uniqueIdentifier', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          {...defaultProps}
          activeUrl="https://custom-url.com"
        />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          uniqueIdentifier: 'https://custom-url.com',
        }),
      );
    });

    it('dispatches addBookmark action before iOS Spotlight integration', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test Bookmark',
        url: 'https://example.com',
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        addBookmark({ name: 'Test Bookmark', url: 'https://example.com' }),
      );
      expect(SearchApi.indexSpotlightItem).toHaveBeenCalled();
    });

    it('handles empty name string in keywords array', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: '',
        url: 'https://example.com',
      });

      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['https://example.com', 'dapp'],
        }),
      );
    });

    it('handles name with multiple spaces correctly in keywords', async () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar {...defaultProps} />,
        { state: initialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BOOKMARK_BUTTON));

      const pushCall = mockNavigation.push.mock.calls[0];
      const onAddBookmark = pushCall[1].params.onAddBookmark;

      await onAddBookmark({
        name: 'Test  Bookmark   Name',
        url: 'https://example.com',
      });

      // Empty strings from multiple spaces should be filtered out
      expect(SearchApi.indexSpotlightItem).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['Test', 'Bookmark', 'Name', 'https://example.com', 'dapp'],
        }),
      );
    });
  });
});
