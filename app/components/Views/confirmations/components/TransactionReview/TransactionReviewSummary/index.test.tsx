import React from 'react';
import TransactionReviewSummary from '.';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  settings: {
    showHexData: true,
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
};
const store = mockStore(initialState);

describe('TransactionReviewSummary', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <ThemeContext.Provider value={mockTheme}>
        <Provider store={store}>
          <TransactionReviewSummary />
        </Provider>
      </ThemeContext.Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
