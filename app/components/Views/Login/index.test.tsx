import React from 'react';
import { shallow } from 'enzyme';
import Login from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
// eslint-disable-next-line import/no-namespace
import * as traceObj from '../../../util/trace';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  user: {
    passwordSet: true,
  },
};
const store = mockStore(initialState);

describe('Login', () => {
  it('should render correctly', () => {
    const spyFetch = jest
      .spyOn(traceObj, 'trace')
      .mockImplementation(() => undefined);
    const wrapper = shallow(
      <Provider store={store}>
        <Login />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
    expect(spyFetch).toHaveBeenCalledTimes(1);
  });
});
