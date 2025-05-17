import React from 'react';
import { screen, act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NftGridEmpty from './NftGridEmpty';
import { StackNavigationProp } from '@react-navigation/stack';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  Webview: { screen: string; params: { url: string } };
  [key: string]: undefined | object;
}

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Create a more complete navigation mock
const mockNavigation = {
  navigate: mockNavigate,
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
  renderWithProvider(<NftGridEmpty navigation={mockNavigation} {...props} />);

describe('NftGridEmpty', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.clearAllMocks();
  });

  it('renders correctly with all elements', () => {
    renderComponent();

    // Check for the container
    expect(screen.getByTestId('nft-empty-container')).toBeOnTheScreen();

    // Check for the image
    expect(screen.getByTestId('nft-empty-image')).toBeOnTheScreen();

    // Check for the main text
    const text = screen.getByTestId('nft-empty-text');
    expect(text).toBeOnTheScreen();
    expect(text.props.children).toBe(strings('wallet.no_nfts_yet'));

    // Check for the learn more button
    const learnMoreButton = screen.getByTestId(
      WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
    );
    expect(learnMoreButton).toBeOnTheScreen();
    expect(screen.getByText(strings('wallet.learn_more'))).toBeOnTheScreen();
  });

  it('navigates to learn more webview when button is pressed', async () => {
    renderComponent();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: AppConstants.URLS.NFT },
    });
  });
});
