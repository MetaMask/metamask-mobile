import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Token from './Token';
import { useDispatch, useSelector } from 'react-redux';
import { Token as TokenType } from '@metamask/assets-controllers';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import ClipboardManager from '../../../../core/ClipboardManager';
import { showAlert } from '../../../../actions/alert';
import {
  selectConversionRateFoAllChains,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
  connect: jest.fn(),
}));

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

jest.mock('../../../UI/TokenImage', () => () => null);

jest.mock('../../../UI/AssetOverview/Balance/Balance', () => ({
  // Mock other exports if needed, or leave empty
  __esModule: true,
  NetworkBadgeSource: jest.fn(() => 'mocked-network-badge-source'),
}));

describe('Token Component', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) return '0xAccount';
      if (selector === selectEvmChainId) return '1';
      if (selector === selectTokenMarketData) return {};
      if (selector === selectTokensBalances)
        return {
          '0xAccount': { '1': '1000000000000000000' }, // 1 token
        };
      if (selector === selectConversionRateFoAllChains) return {};
      if (selector === selectCurrentCurrency) return 'USD';
      return {};
    });
  });

  const mockToken = {
    address: '0xTokenAddress',
    symbol: 'ABC',
    decimals: 18,
    aggregators: ['Aggregator1', 'Aggregator2', 'Aggregator3'],
    chainId: '1',
  };

  const renderComponent = (selected = false) =>
    render(
      <Token
        token={mockToken as TokenType & { chainId: `0x${string}` }}
        selected={selected}
        toggleSelected={jest.fn()}
      />,
    );

  it('renders correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('0 ABC')).toBeTruthy();
    expect(getByText('Token address:')).toBeTruthy();
  });

  it('renders correctly with token chainId', () => {
    const { getByText } = render(
      <Token
        token={
          {
            address: '0xTokenAddress',
            symbol: 'ABC',
            decimals: 18,
            aggregators: ['Aggregator1', 'Aggregator2', 'Aggregator3'],
            // chainId is undefined
            chainId: undefined,
          } as unknown as TokenType & { chainId: `0x${string}` }
        }
        selected={false}
        toggleSelected={jest.fn()}
      />,
    );

    expect(getByText('0 ABC')).toBeTruthy();
    expect(getByText('Token address:')).toBeTruthy();
  });

  it('expands token aggregator list on "show more" press', () => {
    const { getByText } = renderComponent();

    const showMoreButton = getByText('+ 1 more');
    fireEvent.press(showMoreButton);

    expect(
      getByText('Token lists: Aggregator1, Aggregator2, Aggregator3'),
    ).toBeTruthy();
  });

  it('renders checkbox as checked when token is selected', () => {
    const { getByTestId } = renderComponent(true);

    const checkbox = getByTestId('token-select-checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it('renders checkbox as unchecked when token is not selected', () => {
    const { getByTestId } = renderComponent(false);

    const checkbox = getByTestId('token-select-checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it('copies address to clipboard and triggers alert', async () => {
    const { getByText } = renderComponent();
    const copyButton = getByText('0xToken...dress');

    ClipboardManager.setString = jest.fn(() => Promise.resolve());

    await fireEvent.press(copyButton);

    expect(ClipboardManager.setString).toHaveBeenCalledWith('0xTokenAddress');
    expect(mockDispatch).toHaveBeenCalledWith(
      showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: 'Token address copied to clipboard' },
      }),
    );
  });
});
