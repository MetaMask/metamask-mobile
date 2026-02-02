import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { BrowserViewSelectorsIDs } from '../../Views/BrowserTab/BrowserView.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';

// Mock ButtonIcon to pass through testID and onPress
jest.mock('../../../component-library/components/Buttons/ButtonIcon', () => {
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <View />
      </TouchableOpacity>
    ),
    ButtonIconSizes: {
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
  };
});

// Mock InteractionManager
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => {
    callback();
    return { cancel: jest.fn() };
  }),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockInset = { top: 1, right: 2, bottom: 3, left: 4 };
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaInsetsContext: {
    Consumer: ({
      children,
    }: {
      children: (inset: typeof mockInset) => React.ReactNode;
    }) => children(mockInset),
  },
}));

jest.mock('../../../components/hooks/useAccounts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { KeyringTypes } = require('@metamask/keyring-controller');

  return {
    useAccounts: () => ({
      accounts: [
        {
          name: 'Account 1',
          address: '0x0000000000000000000000000000000000000001',
          type: KeyringTypes.hd,
          yOffset: 0,
          isSelected: true,
          assets: {
            fiatBalance: '$0.00\n0 ETH',
          },
          balanceError: undefined,
        },
      ],
      evmAccounts: [
        {
          name: 'Account 1',
          address: '0x0000000000000000000000000000000000000001',
          type: KeyringTypes.hd,
          yOffset: 0,
          isSelected: true,
          assets: {
            fiatBalance: '$0.00\n0 ETH',
          },
          balanceError: undefined,
        },
      ],
      ensByAccountAddress: {},
    }),
  };
});

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ event: 'test' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../hooks/useMetrics/withMetricsAwareness', () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Component: React.ComponentType<any>) => {
    const WithMetrics = (props: Record<string, unknown>) => (
      <Component
        {...props}
        metrics={{
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        }}
      />
    );
    WithMetrics.displayName = 'WithMetricsAwareness';
    return WithMetrics;
  },
);

const mockTabs = [
  { id: 1, url: 'https://example.com', image: 'image1' },
  { id: 2, url: 'https://test.com', image: 'image2' },
];

describe('Tabs', () => {
  const mockNewTab = jest.fn();
  const mockCloseTab = jest.fn();
  const mockCloseTabsView = jest.fn();
  const mockSwitchToTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values that get cleared by clearAllMocks
    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({ event: 'test' });
  });

  afterEach(() => {
    // Don't use resetAllMocks as it clears the mock implementation
  });

  describe('rendering', () => {
    it('renders tabs component with multiple tabs', () => {
      const { toJSON } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders no tabs message when tabs array is empty', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={[]}
          activeTab={null}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(BrowserViewSelectorsIDs.NO_TABS_MESSAGE),
      ).toBeDefined();
    });

    it('renders with single tab', () => {
      const singleTab = [
        { id: 1, url: 'https://example.com', image: 'image1' },
      ];

      const { toJSON } = renderWithProvider(
        <Tabs
          tabs={singleTab}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders top bar with back and add buttons', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(BrowserViewSelectorsIDs.TABS_BACK_BUTTON),
      ).toBeDefined();
      expect(getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB)).toBeDefined();
    });

    it('renders tabs ScrollView when tabs exist', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });
  });

  describe('top bar interactions', () => {
    it('calls closeTabsView when back button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.TABS_BACK_BUTTON));

      expect(mockCloseTabsView).toHaveBeenCalledTimes(1);
    });

    it('calls newTab and closeTabsView when add button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB));

      expect(mockNewTab).toHaveBeenCalledTimes(1);
      expect(mockCloseTabsView).toHaveBeenCalledTimes(1);
    });

    it('tracks analytics event when add button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_NEW_TAB,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks number of tabs when creating new tab', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB));

      expect(mockAddProperties).toHaveBeenCalledWith({
        option_chosen: 'Tabs View Top Bar',
        number_of_tabs: mockTabs.length,
      });
    });
  });

  describe('componentDidMount scrolling', () => {
    it('scrolls to active tab position when tabs exceed visible limit', () => {
      // Create more than TABS_VISIBLE tabs to trigger scrolling
      const manyTabs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        url: `https://tab${i + 1}.com`,
        image: `image${i + 1}`,
      }));

      // Set active tab to be somewhere in the middle
      const activeTabId = 15;

      renderWithProvider(
        <Tabs
          tabs={manyTabs}
          activeTab={activeTabId}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      // InteractionManager.runAfterInteractions should be called for scrolling
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
    });

    it('does not scroll when tabs are within visible limit', () => {
      // Create only a few tabs (less than TABS_VISIBLE)
      const fewTabs = [
        { id: 1, url: 'https://tab1.com', image: 'image1' },
        { id: 2, url: 'https://tab2.com', image: 'image2' },
      ];

      renderWithProvider(
        <Tabs
          tabs={fewTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      // InteractionManager should not be called when tabs are within limit
      expect(InteractionManager.runAfterInteractions).not.toHaveBeenCalled();
    });

    it('scrolls to correct position for active tab in long list', () => {
      const manyTabs = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        url: `https://tab${i + 1}.com`,
        image: `image${i + 1}`,
      }));

      // Active tab at index 20 (row 10 in 2-column grid)
      renderWithProvider(
        <Tabs
          tabs={manyTabs}
          activeTab={21}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles null activeTab gracefully', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={null}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      // Component renders successfully
      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });

    it('handles undefined activeTab gracefully', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={undefined}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });

    it('handles tabs with special characters in URLs', () => {
      const specialTabs = [
        {
          id: 1,
          url: 'https://example.com/path?query=test&param=value#hash',
          image: 'image1',
        },
      ];

      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={specialTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });

    it('handles tabs with long URLs', () => {
      const longUrlTabs = [
        {
          id: 1,
          url: 'https://example.com/' + 'a'.repeat(1000),
          image: 'image1',
        },
      ];

      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={longUrlTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });

    it('handles empty URL in tab', () => {
      const emptyUrlTabs = [{ id: 1, url: '', image: 'image1' }];

      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={emptyUrlTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });

    it('handles large number of tabs', () => {
      const manyTabs = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        url: `https://tab${i + 1}.com`,
        image: `image${i + 1}`,
      }));

      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={manyTabs}
          activeTab={25}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });
  });

  describe('componentDidUpdate', () => {
    it('handles rerender when tabs change', () => {
      const initialTabs = [{ id: 1, url: 'https://tab1.com', image: 'image1' }];

      const { rerender, getByTestId } = renderWithProvider(
        <Tabs
          tabs={initialTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();

      // Add a new tab
      const updatedTabs = [
        ...initialTabs,
        { id: 2, url: 'https://tab2.com', image: 'image2' },
      ];

      rerender(
        <Tabs
          tabs={updatedTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
      );

      // Component still renders correctly after update
      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });

    it('handles rerender when activeTab changes', () => {
      const { rerender, getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();

      // Change active tab
      rerender(
        <Tabs
          tabs={mockTabs}
          activeTab={2}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
      );

      // Component still renders correctly after active tab change
      expect(getByTestId(BrowserViewSelectorsIDs.TABS_COMPONENT)).toBeDefined();
    });
  });

  describe('analytics tracking', () => {
    it('tracks new tab event with correct properties', () => {
      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={mockTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_NEW_TAB,
      );

      expect(mockAddProperties).toHaveBeenCalledWith({
        option_chosen: 'Tabs View Top Bar',
        number_of_tabs: 2,
      });
      expect(mockBuild).toHaveBeenCalled();
    });

    it('tracks event with different tab counts', () => {
      const threeTabs = [
        { id: 1, url: 'https://tab1.com', image: 'image1' },
        { id: 2, url: 'https://tab2.com', image: 'image2' },
        { id: 3, url: 'https://tab3.com', image: 'image3' },
      ];

      const { getByTestId } = renderWithProvider(
        <Tabs
          tabs={threeTabs}
          activeTab={1}
          newTab={mockNewTab}
          closeTab={mockCloseTab}
          closeTabsView={mockCloseTabsView}
          switchToTab={mockSwitchToTab}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB));

      expect(mockAddProperties).toHaveBeenCalledWith({
        option_chosen: 'Tabs View Top Bar',
        number_of_tabs: 3,
      });
    });
  });
});
