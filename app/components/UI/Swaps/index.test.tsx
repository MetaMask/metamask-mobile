import '../../UI/Bridge/_mocks_/initialState';
import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import SwapsAmountView from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { QuoteViewSelectorIDs } from '../../../../e2e/selectors/swaps/QuoteView.selectors';
import { renderFromTokenMinimalUnit } from '../../../util/number';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      setOptions: jest.fn(),
      pop: jest.fn(),
      navigate: jest.fn(),
    }),
    useRoute: () => ({}),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchAggregatorMetadataWithCache: jest.fn(),
      fetchTopAssetsWithCache: jest.fn(),
      fetchTokenWithCache: jest.fn(),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('SwapsAmountView', () => {
  it('renders', async () => {
    const { getByTestId } = renderWithProvider(<SwapsAmountView />, {
      state: mockInitialState,
    });
    expect(
      getByTestId(QuoteViewSelectorIDs.SOURCE_TOKEN_SELECTOR),
    ).toBeDefined();
  });

  it('truncates max amount to 5 decimals when using renderFromTokenMinimalUnit', () => {
    // Given a balance with many decimal places (typical ETH balance in wei)
    const balanceInWei = '1234567890123456789'; // 1.234567890123456789 ETH

    // When converting to readable format with renderFromTokenMinimalUnit
    const result = renderFromTokenMinimalUnit(balanceInWei, 18);

    // Then it should be truncated to 5 decimals
    expect(result).toBe('1.23457');

    // Verify it doesn't show all 18 decimals
    expect(result).not.toContain('234567890123456789');
  });
});
