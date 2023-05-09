import React from 'react';
import TransactionReviewEIP1559 from './';
import configureMockStore from 'redux-mock-store';
import renderWithProvider from '../../../..//util/test/renderWithProvider';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currentCurrency: 'usd',
        conversionRate: 0.1,
      },
      NetworkController: {
        providerConfig: {
          ticker: 'ETH',
          chainId: '1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('TransactionReviewEIP1559', () => {
<<<<<<< HEAD
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewEIP1559 />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
=======
  it('should match snapshot', async () => {
    const container = renderWithProvider(<TransactionReviewEIP1559 />, {
      state: initialState,
    });
    expect(container).toMatchSnapshot();
>>>>>>> 7e2256282 (When the dapp suggested gas fees is too high, change the color of gas estimate times to orange and show an icon)
  });
});
