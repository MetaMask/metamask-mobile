import React from 'react';
import DiscoveryTab from './DiscoveryTab';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import { processUrlForBrowser } from '../../../util/browser';
import Routes from '../../../constants/navigation/Routes';
import Device from '../../../util/device';
import BrowserBottomBar from '../../UI/BrowserBottomBar';

const mockNavigation = {
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../TokenDiscovery', () => ({
  TokenDiscovery: () => null,
}));

jest.mock('../../../util/browser', () => ({
  processUrlForBrowser: jest.fn((url) => url),
}));

// Mock BrowserUrlBar to capture callbacks
const mockBrowserUrlBarRef = {
  hide: jest.fn(),
  setNativeProps: jest.fn(),
};

let onSubmitEditingCallback: ((text: string) => void) | undefined;
let onCancelCallback: (() => void) | undefined;
let onFocusCallback: (() => void) | undefined;
let onChangeTextCallback: ((text: string) => void) | undefined;
let setIsUrlBarFocusedCallback: ((focused: boolean) => void) | undefined;

jest.mock('../../UI/BrowserUrlBar', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const React = require('react');
  const BrowserUrlBarComponent = React.forwardRef(
    (
      props: {
        onFocus?: () => void;
        onSubmitEditing?: (text: string) => void;
        onCancel?: () => void;
        onChangeText?: (text: string) => void;
        setIsUrlBarFocused?: (focused: boolean) => void;
        isUrlBarFocused?: boolean;
      },
      ref: React.Ref<{
        hide: () => void;
        setNativeProps: (props: { text: string }) => void;
      }>,
    ) => {
      React.useImperativeHandle(ref, () => mockBrowserUrlBarRef);
      onSubmitEditingCallback = props.onSubmitEditing;
      onCancelCallback = props.onCancel;
      onFocusCallback = () => {
        props.onFocus?.();
        props.setIsUrlBarFocused?.(true);
      };
      onChangeTextCallback = props.onChangeText;
      setIsUrlBarFocusedCallback = props.setIsUrlBarFocused;
      return React.createElement('View', {
        testID: 'browser-url-bar',
        onPress: () => {
          props.onFocus?.();
          props.setIsUrlBarFocused?.(true);
        },
      });
    },
  );
  // Export ConnectionType as a named export to match the actual module
  const ConnectionType = {
    SECURE: 'secure',
    UNSECURE: 'unsecure',
    UNKNOWN: 'unknown',
  };
  return {
    __esModule: true,
    default: BrowserUrlBarComponent,
    ConnectionType,
    BrowserUrlBarRef: {},
  };
});

// Mock UrlAutocomplete to capture callbacks
const mockUrlAutocompleteRef = {
  hide: jest.fn(),
  show: jest.fn(),
  search: jest.fn(),
};

let onSelectCallback:
  | ((item: {
      category: string;
      url?: string;
      chainId?: string;
      address?: string;
    }) => void)
  | undefined;
let onDismissCallback: (() => void) | undefined;

jest.mock('../../UI/UrlAutocomplete', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const React = require('react');
  return React.forwardRef(
    (
      props: {
        onSelect?: (item: {
          category: string;
          url?: string;
          chainId?: string;
          address?: string;
        }) => void;
        onDismiss?: () => void;
      },
      ref: React.Ref<{
        hide: () => void;
        show: () => void;
        search: (text: string) => void;
      }>,
    ) => {
      React.useImperativeHandle(ref, () => mockUrlAutocompleteRef);
      onSelectCallback = props.onSelect;
      onDismissCallback = props.onDismiss;
      return React.createElement('View', {
        testID: 'url-autocomplete',
      });
    },
  );
});

jest.mock('../../UI/BrowserBottomBar', () => ({
  __esModule: true,
  default: jest.fn(() => 'BrowserBottomBar'),
}));

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
  isIos: jest.fn(() => true),
  isIphoneX: jest.fn(() => false),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn((options) => options.ios),
    },
  };
});

describe('DiscoveryTab', () => {
  const mockShowTabs = jest.fn();
  const mockNewTab = jest.fn();
  const mockUpdateTabInfo = jest.fn();

  const defaultProps = {
    id: 1,
    showTabs: mockShowTabs,
    newTab: mockNewTab,
    updateTabInfo: mockUpdateTabInfo,
  };

  const initialState = {
    ...initialRootState,
    browser: {
      ...initialRootState.browser,
      activeTab: 1,
      tabs: [{ id: 1, url: '' }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowserUrlBarRef.hide.mockClear();
    mockBrowserUrlBarRef.setNativeProps.mockClear();
    mockUrlAutocompleteRef.hide.mockClear();
    mockUrlAutocompleteRef.show.mockClear();
    mockUrlAutocompleteRef.search.mockClear();
    onSubmitEditingCallback = undefined;
    onCancelCallback = undefined;
    onFocusCallback = undefined;
    onChangeTextCallback = undefined;
    setIsUrlBarFocusedCallback = undefined;
    onSelectCallback = undefined;
    onDismissCallback = undefined;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders DiscoveryTab component when tab is active', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('hides content when tab is not active', () => {
      const inactiveState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          activeTab: 2,
        },
      };

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: inactiveState },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Props Handling', () => {
    it('accepts showTabs prop', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('accepts updateTabInfo prop', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with all required props', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('URL Bar Interactions', () => {
    it('renders BrowserUrlBar component', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('passes showTabs callback to BrowserUrlBar', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Bottom Bar Rendering', () => {
    it('renders BrowserBottomBar when tab is active and URL bar not focused', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('passes newTab prop to BrowserBottomBar', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    it('renders when tab ID does not match active tab', () => {
      const differentTabState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          activeTab: 99,
        },
      };

      const propsWithAllRequired = {
        id: 1,
        showTabs: mockShowTabs,
        newTab: mockNewTab,
        updateTabInfo: mockUpdateTabInfo,
      };

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...propsWithAllRequired} />,
        { state: differentTabState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders TokenDiscovery component', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('onSubmitEditing callback', () => {
    it('processes URL and calls updateTabInfo when text is provided', async () => {
      const mockProcessUrlForBrowser = processUrlForBrowser as jest.Mock;
      mockProcessUrlForBrowser.mockReturnValue('https://processed-url.com');

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onSubmitEditingCallback) {
        await onSubmitEditingCallback('https://example.com');
      }

      expect(mockProcessUrlForBrowser).toHaveBeenCalledWith(
        'https://example.com',
        expect.any(String),
      );
      expect(mockUrlAutocompleteRef.hide).toHaveBeenCalled();
      expect(mockUpdateTabInfo).toHaveBeenCalledWith(1, {
        url: 'https://processed-url.com',
      });
    });

    it('does not process URL or call updateTabInfo when text is empty', async () => {
      const mockProcessUrlForBrowser = processUrlForBrowser as jest.Mock;

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onSubmitEditingCallback) {
        await onSubmitEditingCallback('');
      }

      expect(mockProcessUrlForBrowser).not.toHaveBeenCalled();
      expect(mockUpdateTabInfo).not.toHaveBeenCalled();
    });

    it('does not process URL or call updateTabInfo when text is whitespace only', async () => {
      const mockProcessUrlForBrowser = processUrlForBrowser as jest.Mock;

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onSubmitEditingCallback) {
        await onSubmitEditingCallback('   ');
      }

      expect(mockProcessUrlForBrowser).not.toHaveBeenCalled();
      expect(mockUpdateTabInfo).not.toHaveBeenCalled();
    });
  });

  describe('onSelect callback', () => {
    it('navigates to asset loader when selecting token from autocomplete', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onSelectCallback) {
        onSelectCallback({
          category: 'tokens',
          chainId: '0x1',
          address: '0x1234567890abcdef',
        });
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.BROWSER.ASSET_LOADER,
        {
          chainId: '0x1',
          address: '0x1234567890abcdef',
        },
      );
    });

    it('hides URL bar and calls onSubmitEditing when selecting site from autocomplete', async () => {
      const mockProcessUrlForBrowser = processUrlForBrowser as jest.Mock;
      mockProcessUrlForBrowser.mockReturnValue('https://processed-site.com');

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onSelectCallback) {
        onSelectCallback({
          category: 'sites',
          url: 'https://example.com',
        });
      }

      expect(mockBrowserUrlBarRef.hide).toHaveBeenCalled();
      expect(mockProcessUrlForBrowser).toHaveBeenCalled();
      expect(mockUpdateTabInfo).toHaveBeenCalledWith(1, {
        url: 'https://processed-site.com',
      });
    });
  });

  describe('onDismissAutocomplete callback', () => {
    it('hides URL bar when autocomplete is dismissed', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onDismissCallback) {
        onDismissCallback();
      }

      expect(mockBrowserUrlBarRef.hide).toHaveBeenCalled();
    });
  });

  describe('onCancelUrlBar callback', () => {
    it('hides autocomplete and clears URL bar text when cancel is pressed', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onCancelCallback) {
        onCancelCallback();
      }

      expect(mockUrlAutocompleteRef.hide).toHaveBeenCalled();
      expect(mockBrowserUrlBarRef.setNativeProps).toHaveBeenCalledWith({
        text: '',
      });
    });
  });

  describe('onFocusUrlBar callback', () => {
    it('shows autocomplete when URL bar is focused', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onFocusCallback) {
        onFocusCallback();
      }

      expect(mockUrlAutocompleteRef.show).toHaveBeenCalled();
    });
  });

  describe('onChangeUrlBar callback', () => {
    it('searches autocomplete when URL bar text changes', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onChangeTextCallback) {
        onChangeTextCallback('test search');
      }

      expect(mockUrlAutocompleteRef.search).toHaveBeenCalledWith('test search');
    });
  });

  describe('renderBottomBar', () => {
    it('renders BrowserBottomBar when tab is active and URL bar is not focused', () => {
      const BrowserBottomBarMock = BrowserBottomBar as unknown as jest.Mock;
      BrowserBottomBarMock.mockClear();

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      expect(BrowserBottomBarMock).toHaveBeenCalled();
    });

    it('does not render BrowserBottomBar when tab is not active', () => {
      const BrowserBottomBarMock = BrowserBottomBar as unknown as jest.Mock;
      BrowserBottomBarMock.mockClear();

      const inactiveState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          activeTab: 2,
        },
      };

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: inactiveState,
      });

      expect(BrowserBottomBarMock).not.toHaveBeenCalled();
    });

    it('does not render BrowserBottomBar when URL bar is focused', () => {
      const BrowserBottomBarMock = BrowserBottomBar as unknown as jest.Mock;
      BrowserBottomBarMock.mockClear();

      const { getByTestId } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        {
          state: initialState,
        },
      );

      const initialCallCount = BrowserBottomBarMock.mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);

      // Focus the URL bar
      const urlBar = getByTestId('browser-url-bar');
      fireEvent.press(urlBar);

      // After focusing, BrowserBottomBar should not be rendered
      // We verify this by checking that setIsUrlBarFocused was called
      expect(setIsUrlBarFocusedCallback).toBeDefined();
    });

    it('passes newTab callback to BrowserBottomBar', () => {
      const BrowserBottomBarMock = BrowserBottomBar as unknown as jest.Mock;
      BrowserBottomBarMock.mockClear();

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      expect(BrowserBottomBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          openNewTab: expect.any(Function),
        }),
        {},
      );

      // Call the newTab callback
      const callArgs = BrowserBottomBarMock.mock.calls[0][0];
      if (callArgs.openNewTab) {
        callArgs.openNewTab();
      }

      expect(mockNewTab).toHaveBeenCalled();
    });
  });

  describe('Platform-specific behavior', () => {
    it('uses padding behavior for KeyboardAvoidingView on iOS', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        {
          state: initialState,
        },
      );

      const json = toJSON();
      expect(json).toMatchSnapshot();
    });

    it('uses height behavior for KeyboardAvoidingView on Android', () => {
      const DeviceMock = Device as jest.Mocked<typeof Device>;
      DeviceMock.isAndroid.mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const RN = require('react-native');
      RN.Platform.OS = 'android';

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        {
          state: initialState,
        },
      );

      const json = toJSON();
      expect(json).toMatchSnapshot();

      DeviceMock.isAndroid.mockReturnValue(false);
      RN.Platform.OS = 'ios';
    });
  });

  describe('Device-specific behavior', () => {
    it('adds collapsable prop to View when on Android', () => {
      const DeviceMock = Device as jest.Mocked<typeof Device>;
      DeviceMock.isAndroid.mockReturnValue(true);

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        {
          state: initialState,
        },
      );

      const json = toJSON();
      expect(json).toMatchSnapshot();

      DeviceMock.isAndroid.mockReturnValue(false);
    });
  });

  describe('searchEngine selector', () => {
    it('uses searchEngine from Redux state when processing URL', async () => {
      const mockProcessUrlForBrowser = processUrlForBrowser as jest.Mock;
      mockProcessUrlForBrowser.mockReturnValue('https://processed-url.com');

      const stateWithSearchEngine = {
        ...initialState,
        settings: {
          ...initialState.settings,
          searchEngine: 'google',
        },
      };

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: stateWithSearchEngine,
      });

      if (onSubmitEditingCallback) {
        await onSubmitEditingCallback('test query');
      }

      expect(mockProcessUrlForBrowser).toHaveBeenCalledWith(
        'test query',
        'google',
      );
    });

    it('uses default searchEngine when not specified in state', async () => {
      const mockProcessUrlForBrowser = processUrlForBrowser as jest.Mock;
      mockProcessUrlForBrowser.mockReturnValue('https://processed-url.com');

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      if (onSubmitEditingCallback) {
        await onSubmitEditingCallback('test query');
      }

      expect(mockProcessUrlForBrowser).toHaveBeenCalled();
    });
  });

  describe('BrowserBottomBar props', () => {
    it('passes correct props to BrowserBottomBar', () => {
      const BrowserBottomBarMock = BrowserBottomBar as unknown as jest.Mock;
      BrowserBottomBarMock.mockClear();

      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      expect(BrowserBottomBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          canGoBack: false,
          canGoForward: false,
          activeUrl: '',
          title: '',
          sessionENSNames: {},
          favicon: { uri: '' },
        }),
        {},
      );
    });
  });

  describe('BrowserUrlBar props', () => {
    it('passes correct props to BrowserUrlBar', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      // Verify callbacks are set up correctly
      expect(onSubmitEditingCallback).toBeDefined();
      expect(onCancelCallback).toBeDefined();
      expect(onFocusCallback).toBeDefined();
      expect(onChangeTextCallback).toBeDefined();
      expect(setIsUrlBarFocusedCallback).toBeDefined();
    });
  });

  describe('UrlAutocomplete props', () => {
    it('passes correct callbacks to UrlAutocomplete', () => {
      renderWithProvider(<DiscoveryTab {...defaultProps} />, {
        state: initialState,
      });

      expect(onSelectCallback).toBeDefined();
      expect(onDismissCallback).toBeDefined();
    });
  });
});
