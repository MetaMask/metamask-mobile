import React from 'react';
import TransactionReviewInformation from '.';
import configureMockStore from 'redux-mock-store';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  transaction: {
    value: '',
    data: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
  settings: {
    primaryCurrency: 'ETH',
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
  swaps: {
    featureFlags: {
      smart_transactions: {
        mobile_active: true,
      },
    },
  },
};
const store = mockStore(initialState);

jest.mock('react-native-material-textfield', () => {
  const React = require('react');
  const { TextInput } = require('react-native');

  return {
    OutlinedTextField: React.forwardRef((props: any, ref: any) => (
      <TextInput ref={ref} {...props} />
    )),
  };
});

describe('TransactionReviewInformation', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <ThemeContext.Provider value={mockTheme}>
        <Provider store={store}>
          <TransactionReviewInformation EIP1559GasData={{}} />
        </Provider>
      </ThemeContext.Provider>,
    );
    screen.debug();
    expect(wrapper).toMatchSnapshot();
  });
});
