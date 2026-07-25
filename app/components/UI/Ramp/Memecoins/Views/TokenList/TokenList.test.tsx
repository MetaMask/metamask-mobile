import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import TokenList from './TokenList';
import { CROSSMINT_STAGING_XMEME_TOKEN } from '../../crossmint';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../crossmint', () => {
  const actual = jest.requireActual('../../crossmint');
  return {
    ...actual,
    isCrossmintConfigured: jest.fn(() => true),
    fetchCrossmintMemecoinTokens: jest.fn(),
  };
});

const { fetchCrossmintMemecoinTokens } = jest.requireMock('../../crossmint') as {
  fetchCrossmintMemecoinTokens: jest.Mock;
};

describe('Memecoins TokenList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCrossmintMemecoinTokens.mockResolvedValue([
      CROSSMINT_STAGING_XMEME_TOKEN,
    ]);
  });

  it('renders token list', async () => {
    const { toJSON, getByText } = render(<TokenList />);

    await waitFor(() => {
      expect(getByText('XMEME')).toBeOnTheScreen();
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
