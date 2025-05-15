import React from 'react';
import { screen, act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NftGridFooter from './NftGridFooter';
import { StackNavigationProp } from '@react-navigation/stack';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      push: mockPush,
    }),
  };
});

// Create a more complete navigation mock
const mockNavigation = {
  navigate: mockNavigate,
  push: mockPush,
  dispatch: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  dangerouslyGetState: jest.fn(),
  dangerouslyGetParent: jest.fn(),
  setParams: jest.fn(),
} as unknown as StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>;

const renderComponent = (props = {}) =>
  renderWithProvider(<NftGridFooter navigation={mockNavigation} {...props} />);

describe('NftGridFooter', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  it('renders correctly with all elements', () => {
    renderComponent();

    // Check for the no collectibles text
    expect(
      screen.getByText(strings('wallet.no_collectibles')),
    ).toBeOnTheScreen();

    // Check for the add collectibles button
    const addButton = screen.getByTestId(
      WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
    );
    expect(addButton).toBeOnTheScreen();
    expect(
      screen.getByText(strings('wallet.add_collectibles')),
    ).toBeOnTheScreen();
  });
});
