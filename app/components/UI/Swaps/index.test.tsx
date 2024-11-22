import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import SwapsAmountView from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';

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

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

/*
const defaultProps = {
  swapsTokens: [],
  swapsControllerTokens: [],
  tokensWithBalance: [],
  tokensTopAssets: [],
  accounts: {},
  selectedAddress: '',
  balances: {},
  conversionRate: 0,
  currentCurrency: 'usd',
  tokenExchangeRates: {},
  providerConfig: {},
  chainId: '1',
  networkConfigurations: {},
  setLiveness: () => {
    // do nothing
  },
};
 */

describe.skip('SwapsAmountView', () => {
  it('render correctly', () => {
    const wrapper = renderWithProvider(<SwapsAmountView />, {
      state: mockInitialState,
    });
    expect(wrapper).toMatchSnapshot();
  });
});
