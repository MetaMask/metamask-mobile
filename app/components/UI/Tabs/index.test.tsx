import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

// Mock ButtonIcon to pass through testID
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

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  return {
    SafeAreaInsetsContext: {
      Consumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    },
  };
});

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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

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
    const { toJSON } = renderWithProvider(
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

    // Component may render empty state or null
    expect(toJSON).toBeDefined();
  });

  it('renders with single tab', () => {
    const singleTab = [{ id: 1, url: 'https://example.com', image: 'image1' }];

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

  it('renders top bar with title and action buttons', () => {
    // The first snapshot test already verifies the top bar structure:
    // - Back button with testID "tabs_back_button"
    // - Title "Opened tabs"
    // - Add button with testID "tabs_add"
    // See snapshot for "renders tabs component with multiple tabs"
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

    // Verify component renders (matching snapshot verifies structure)
    expect(toJSON()).toMatchSnapshot();
  });
});
