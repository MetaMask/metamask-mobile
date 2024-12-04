import React from 'react';
import TransactionReviewData from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
  },
  transaction: {
    transaction: {
      data: '',
    },
    value: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
  settings: {
    showFiatOnTestnets: false, // Add this key with a mock value
  },
  alert: {
    isVisible: false, // Add mock values for the alert state
    autodismiss: true,
    content: null,
    data: {},
  },
};
const store = mockStore(initialState);

describe('TransactionReviewData', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <ThemeContext.Provider value={mockTheme}>
        <Provider store={store}>
          <TransactionReviewData />
        </Provider>
      </ThemeContext.Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
