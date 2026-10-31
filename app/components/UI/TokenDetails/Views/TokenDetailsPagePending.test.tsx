import { render } from '@testing-library/react-native';
import React from 'react';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import type { TokenDetailsRouteParams } from '../constants/constants';
import TokenDetailsPagePending, {
  TOKEN_DETAILS_PAGE_PENDING_TEST_ID,
} from './TokenDetailsPagePending';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../hooks/useTokenPrice', () => ({
  useTokenPrice: () => ({
    currentPrice: 0,
    currentCurrency: 'usd',
    isLoading: true,
  }),
}));

jest.mock('../components/TokenDetailsInlineHeader', () => ({
  TokenDetailsInlineHeader: () => null,
}));

const token = {
  address: '0xabc',
  chainId: '0x1',
  symbol: 'PEPE',
} as TokenDetailsRouteParams;

describe('TokenDetailsPagePending', () => {
  it('renders a skeleton without Buy, Sell, or Swap while the page is unresolved', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsPagePending token={token} />,
    );

    expect(getByTestId(TOKEN_DETAILS_PAGE_PENDING_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(TokenOverviewSelectorsIDs.SWAP_BUTTON)).toBeNull();
    expect(queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON)).toBeNull();
    expect(queryByTestId('token-details-footer-quick-buy')).toBeNull();
    expect(queryByTestId('token-details-footer-quick-sell')).toBeNull();
    expect(queryByTestId('bottomsheetfooter')).toBeNull();
  });
});
