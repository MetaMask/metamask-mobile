import React from 'react';
import TransactionReviewDetailsCard from '.';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('TransactionReviewDetailsCard', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewDetailsCard />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
