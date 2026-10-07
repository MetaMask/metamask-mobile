import React from 'react';
import { render } from '@testing-library/react-native';

import { TokenDetailsV1, TOKEN_DETAILS_V1_TEST_ID } from './TokenDetailsV1';
import type { TokenDetailsRouteParams } from '../constants/constants';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const baseToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
  isETH: false,
  isNative: false,
  balanceError: null,
  image: '',
  logo: '',
  aggregators: [],
  decimals: 18,
} as unknown as TokenDetailsRouteParams;

describe('TokenDetailsV1', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders the placeholder meme-TDP body with the token symbol in the header', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeTruthy();
    expect(getByText('PEPE')).toBeTruthy();
  });

  it('renders the placeholder title and description with the token symbol', () => {
    const { getByText } = render(<TokenDetailsV1 token={baseToken} />);

    expect(getByText('Dedicated meme coin view')).toBeTruthy();
    expect(
      getByText(
        'A tailored experience for PEPE is being built. Check back soon.',
      ),
    ).toBeTruthy();
  });

  it('falls back to "this token" when the token has no symbol', () => {
    const { getByText } = render(
      <TokenDetailsV1
        token={
          {
            ...baseToken,
            symbol: undefined,
          } as unknown as TokenDetailsRouteParams
        }
      />,
    );

    expect(
      getByText(
        'A tailored experience for this token is being built. Check back soon.',
      ),
    ).toBeTruthy();
  });
});
