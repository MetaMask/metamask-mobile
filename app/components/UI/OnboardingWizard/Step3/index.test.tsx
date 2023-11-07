import React from 'react';
import Step3 from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('Step3', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Step3 coachmarkRef={{}} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
