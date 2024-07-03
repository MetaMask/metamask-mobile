import React from 'react';
import TransactionReviewDetailsCard from '.';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('TransactionReviewDetailsCard', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <TransactionReviewDetailsCard />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
