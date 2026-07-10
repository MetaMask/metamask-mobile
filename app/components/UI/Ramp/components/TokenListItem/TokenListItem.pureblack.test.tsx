import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import TokenListItem from './TokenListItem';
import { DepositCryptoCurrency } from '../../types/legacyDeposit';

let mockIsPureBlackEnabled = false;

// Match the component's import path for themeUtils so the getter is mocked
jest.mock('../../../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

// Replace ListItemSelect with a simple View that forwards the style prop
jest.mock(
  '../../../../../component-library/components/List/ListItemSelect',
  () =>
    ({ style, children }: { style?: object; children: React.ReactNode }) =>
      React.createElement(View, { testID: 'list-item-select', style }, children),
);

const baseToken: DepositCryptoCurrency = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl: 'https://example.com/eth.png',
};

describe('TokenListItem - Pure Black styling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPureBlackEnabled = false;
  });

  it('uses transparent background in pure black dark mode', () => {
    mockIsPureBlackEnabled = true;

    const darkTheme = { ...mockTheme, themeAppearance: AppThemeKey.dark };

    const { getByTestId } = renderWithProvider(
      <TokenListItem token={baseToken} onPress={() => {}} />,
      { theme: darkTheme },
    );

    const container = getByTestId('list-item-select');
    const style = container.props.style;
    const flattened =
      Array.isArray(style) ? Object.assign({}, ...style) : style || {};

    expect(flattened.backgroundColor).toBe('transparent');
  });
});

