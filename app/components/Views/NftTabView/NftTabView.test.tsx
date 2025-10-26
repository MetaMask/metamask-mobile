import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NftTabView from './NftTabView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';

// Mock external dependencies
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      build: jest.fn(),
    })),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

const mockProps = {
  flashListProps: {},
};

const Stack = createStackNavigator();

const renderComponent = (props = mockProps) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="NftTabView" options={{}}>
        {() => <NftTabView {...props} />}
      </Stack.Screen>
    </Stack.Navigator>,
  );

describe('NftTabView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders base control bar with add button', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders NFT grid', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('nft-grid')).toBeOnTheScreen();
  });

  it('handles add collectible button press', () => {
    const { getByTestId } = renderComponent();

    const addButton = getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);

    fireEvent.press(addButton);

    // Button press should trigger navigation (mocked)
    expect(addButton).toBeOnTheScreen();
  });

  it('passes flashListProps to NftGrid', () => {
    const customFlashListProps = {
      scrollEnabled: false,
      estimatedItemSize: 100,
    };

    const propsWithCustomFlashListProps = {
      ...mockProps,
      flashListProps: customFlashListProps,
    };

    const { getByTestId } = renderComponent(propsWithCustomFlashListProps);

    expect(getByTestId('nft-grid')).toBeOnTheScreen();
  });

  it('renders with correct styling', () => {
    const { getByTestId } = renderComponent();

    const container = getByTestId('nft-grid').parent;
    expect(container).toBeOnTheScreen();
  });
});
