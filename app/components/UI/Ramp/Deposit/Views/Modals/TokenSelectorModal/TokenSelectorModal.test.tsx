import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelectorModal from './TokenSelectorModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import useSupportedTokens from '../../../hooks/useSupportedTokens';
import useSearchTokenResults from '../../../hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'TokenSelectorModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('../../../hooks/useSupportedTokens', () => jest.fn());
jest.mock('../../../hooks/useSearchTokenResults', () => jest.fn());

const mockTokens = [
  {
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 'eip155:1',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
  },
  {
    assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 'eip155:1',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
  },
];

describe('TokenSelectorModal Component', () => {
  const mockHandleSelectAssetId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      selectedAssetId:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      handleSelectAssetId: mockHandleSelectAssetId,
    });
    (useSupportedTokens as jest.Mock).mockReturnValue(mockTokens);
    (useSearchTokenResults as jest.Mock).mockReturnValue(mockTokens);
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(TokenSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays tokens and allows selection', async () => {
    const { getByText } = renderWithProvider(TokenSelectorModal);

    expect(getByText('USDC')).toBeTruthy();
    expect(getByText('USDT')).toBeTruthy();

    const tetherElement = getByText('USDT');
    fireEvent.press(tetherElement);

    await waitFor(() => {
      expect(mockHandleSelectAssetId).toHaveBeenCalledWith(
        'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
    });
  });

  it('displays empty state when no tokens match search', async () => {
    (useSearchTokenResults as jest.Mock).mockReturnValue([]);

    const { getByPlaceholderText, getByText } =
      renderWithProvider(TokenSelectorModal);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, 'Nonexistent Token');

    await waitFor(() => {
      expect(getByText('No tokens match "Nonexistent Token"')).toBeTruthy();
    });
  });

  it('displays network filter selector when pressing "All networks" button', async () => {
    const { getByText, toJSON } = renderWithProvider(TokenSelectorModal);

    const allNetworksButton = getByText('All networks');
    fireEvent.press(allNetworksButton);

    await waitFor(() => {
      expect(getByText('Deselect all')).toBeTruthy();
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
