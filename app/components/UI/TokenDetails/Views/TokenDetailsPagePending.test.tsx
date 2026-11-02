import { render } from '@testing-library/react-native';
import React from 'react';
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

const actionFooterProps: Record<string, unknown>[] = [];

jest.mock('../components/TokenDetailsActionFooter', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      actionFooterProps.push(props);
      return <View testID="token-details-action-footer" />;
    },
  };
});

const token = {
  address: '0xabc',
  chainId: '0x1',
  symbol: 'PEPE',
} as TokenDetailsRouteParams;

describe('TokenDetailsPagePending', () => {
  beforeEach(() => {
    actionFooterProps.length = 0;
  });

  it('shows the shared action footer while the page is unresolved', () => {
    const { getByTestId } = render(<TokenDetailsPagePending token={token} />);

    expect(getByTestId(TOKEN_DETAILS_PAGE_PENDING_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId('token-details-action-footer')).toBeOnTheScreen();
    expect(actionFooterProps[0]).toEqual(expect.objectContaining({ token }));
    expect(actionFooterProps[0].traderPositionPnl).toBeUndefined();
  });
});
