import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CollectibleView from '.';
import { ThemeContext } from '../../../util/theme';
import { getNetworkNavbarOptions } from '../../UI/Navbar';

// Mock the Navbar helper to spy on update calls
jest.mock('../../UI/Navbar', () => ({
  getNetworkNavbarOptions: jest.fn(),
}));

// Mock collectiblesTransferInformation so we can control tradability.
// In this mock, the address '0xabc' (case-insensitive) is marked as non-tradable.
jest.mock('../../../util/collectibles-transfer', () => ({
  default: {
    '0xabc': { tradable: false },
  },
}));

// Mock the i18n strings helper so that it returns a predictable value.
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    if (key === 'asset_overview.send_button') return 'Send';
    return key;
  }),
}));

// A sample theme value for ThemeContext.
const mockTheme = {
  colors: {
    background: { default: '#ffffff' },
    primary: { inverse: '#000000' },
  },
};

describe('CollectibleView', () => {
  // Default collectible will be considered tradable because its address isn't in our mock.
  const defaultCollectible = {
    address: '0x123', // Not in mocked collectiblesTransferInformation so defaults to tradable (true)
    contractName: 'Test Collectible',
  };

  let newAssetTransactionMock;
  let navigationMock;
  let routeMock;

  beforeEach(() => {
    newAssetTransactionMock = jest.fn();
    navigationMock = {
      navigate: jest.fn(),
    };
    routeMock = {
      params: defaultCollectible,
    };

    // Clear any previous calls to our mocked function
    getNetworkNavbarOptions.mockClear();
  });
  // Helper to render the component with ThemeContext
  const renderComponent = (route = routeMock) =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <CollectibleView
          navigation={navigationMock}
          newAssetTransaction={newAssetTransactionMock}
          route={route}
        />
      </ThemeContext.Provider>,
    );

  it('should render the CollectibleOverview component', () => {
    const { getByText } = renderComponent();

    // As an example, we assume that the collectible contract name is rendered.
    // (Adjust based on what CollectibleOverview renders.)
    expect(getByText('Test Collectible')).toBeTruthy();
  });

  it('should call getNetworkNavbarOptions on mount', () => {
    renderComponent();
    expect(getNetworkNavbarOptions).toHaveBeenCalled();
  });

  it('should render send button if collectible is tradable', () => {
    const { getByText } = renderComponent();

    // The button text is converted to uppercase, so "Send" becomes "SEND"
    const sendButton = getByText('SEND');
    expect(sendButton).toBeTruthy();
  });

  it('should not render send button if collectible is not tradable', () => {
    // Create a collectible whose lowercased address matches our non-tradable mock.
    const nonTradableCollectible = {
      address: '0xABC', // lowercased becomes '0xabc', which is marked non-tradable
      contractName: 'Non Tradable Collectible',
    };

    const { queryByText } = renderComponent({ params: nonTradableCollectible });
    expect(queryByText('SEND')).toBeNull();
  });

  it('should call newAssetTransaction and navigate on send button press', () => {
    const { getByText } = renderComponent();

    // Find the send button (text is "SEND")
    const sendButton = getByText('SEND');
    fireEvent.press(sendButton);

    expect(newAssetTransactionMock).toHaveBeenCalledWith(defaultCollectible);
    expect(navigationMock.navigate).toHaveBeenCalledWith('SendFlowView');
  });

  it('should call getNetworkNavbarOptions on component update', () => {
    const { rerender } = renderComponent();

    // Clear previous calls so we can assert update behavior
    getNetworkNavbarOptions.mockClear();

    // Re-render the component with the same props to simulate an update.
    rerender(
      <ThemeContext.Provider value={mockTheme}>
        <CollectibleView
          navigation={navigationMock}
          newAssetTransaction={newAssetTransactionMock}
          route={routeMock}
        />
      </ThemeContext.Provider>,
    );

    expect(getNetworkNavbarOptions).toHaveBeenCalled();
  });
});
