import React from 'react';
import { Provider } from 'react-redux';
import { measureRenders } from 'reassure';
import configureStore from '../../../../../../util/test/configureStore';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../../../../util/theme';
import type { PopularToken } from '../hooks/usePopularTokens';
import PopularTokensList from './PopularTokensList';

const mockTokens: PopularToken[] = Array.from(
  { length: 20 },
  (_value, index) => ({
    assetId: `eip155:1/erc20:0x${(index + 1).toString(16).padStart(40, '0')}`,
    name: `Popular Token ${index + 1}`,
    symbol: `TOK${index + 1}`,
    iconUrl: `https://example.com/token-${index + 1}.png`,
    price: index + 1.25,
    priceChange1d: index % 2 === 0 ? 2.5 : -1.5,
  }),
);

jest.mock('../hooks', () => ({
  usePopularTokens: () => ({
    tokens: mockTokens,
    isInitialLoading: false,
    isRefreshing: false,
    error: null,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
  useRampsButtonClickedEvent: () => ({
    trackBuyButtonClicked: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: jest.fn(),
  }),
}));

const store = configureStore(initialRootState);
const ProvidersWrapper = ({ children }: { children: React.ReactElement }) => (
  <Provider store={store}>
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  </Provider>
);

test('PopularTokensList mount performance with 20 tokens', async () => {
  await measureRenders(<PopularTokensList />, {
    wrapper: ProvidersWrapper,
  });
});
