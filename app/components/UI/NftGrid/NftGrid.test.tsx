import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NftGridFooter from './NftGridFooter';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { StackNavigationProp } from '@react-navigation/stack';
import NftGridEmpty from './NftGridEmpty';
import NftGridItem from './NftGridItem';
import { Nft } from '@metamask/assets-controllers';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { RootState } from '../../../reducers';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

type MockNavigation = StackNavigationProp<
  {
    AddAsset: { assetType: string };
    [key: string]: object | undefined;
  },
  'AddAsset'
>;

const mockNavigation: MockNavigation = {
  push: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  popToTop: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  setParams: jest.fn(),
  getParent: jest.fn(),
} as unknown as MockNavigation;

const mockState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      PreferencesController: {
        isIpfsGatewayEnabled: true,
      },
    },
  },
} as unknown as RootState;

describe('NftGridFooter', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<NftGridFooter navigation={mockNavigation} />);
    expect(getByText('Don’t see your NFT?')).toBeTruthy();
    expect(getByText('Import NFTs')).toBeTruthy();
  });

  it('calls navigation.push when the button is pressed', () => {
    const { getByTestId } = render(
      <NftGridFooter navigation={mockNavigation} />,
    );
    const button = getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
    fireEvent.press(button);
    expect(mockNavigation.push).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
  });

  it('matches the snapshot', () => {
    const tree = render(<NftGridFooter navigation={mockNavigation} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

describe('NftGridEmpty', () => {
  it('renders without crashing', () => {
    const { getByText, getByTestId } = render(
      <NftGridEmpty navigation={mockNavigation} />,
    );
    expect(getByText('No NFTs yet')).toBeTruthy();
    expect(getByText('Learn more')).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON)).toBeTruthy();
  });

  it('calls navigation.navigate when the button is pressed', () => {
    const { getByTestId } = render(
      <NftGridEmpty navigation={mockNavigation} />,
    );
    const button = getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
    fireEvent.press(button);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/nfts/nft-tokens-in-your-metamask-wallet/',
      },
    });
  });

  it('logs "goToLearnMore" when the learn_more text is pressed', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const { getByText } = render(<NftGridEmpty navigation={mockNavigation} />);
    const learnMoreText = getByText('Learn more');
    fireEvent.press(learnMoreText);

    // TODO: actually test for learn more redirect
    expect(consoleSpy).toHaveBeenCalledWith('goToLearnMore');
    consoleSpy.mockRestore();
  });

  it('matches the snapshot', () => {
    const tree = render(<NftGridEmpty navigation={mockNavigation} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

describe('NftGridItem', () => {
  const mockNft: Nft = {
    address: '0x123',
    tokenId: '1',
    name: 'Test NFT',
    image: 'https://example.com/image.png',
    collection: {
      name: 'Test Collection',
    },
    description: '',
    standard: 'erc721',
  };

  const mockNavigate = jest.fn();
  (useNavigation as jest.Mock).mockReturnValue({
    navigate: mockNavigate,
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    popToTop: jest.fn(),
  });

  it('renders correctly with a valid nft', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NftGridItem nft={mockNft} navigation={mockNavigation} />,
      { state: mockState },
    );

    expect(getByTestId(mockNft.name as string)).toBeTruthy();
    expect(getByText('Test NFT')).toBeTruthy();
    expect(getByText('Test Collection')).toBeTruthy();
  });

  it('matches the snapshot', () => {
    const tree = renderWithProvider(
      <NftGridItem nft={mockNft} navigation={mockNavigation} />,
      { state: mockState },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
