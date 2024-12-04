import React from 'react';
import TransactionReviewDetailsCard from '.';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('TransactionReviewDetailsCard', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <ThemeContext.Provider value={mockTheme}>
        <Provider store={store}>
          <TransactionReviewDetailsCard />
        </Provider>
      </ThemeContext.Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
