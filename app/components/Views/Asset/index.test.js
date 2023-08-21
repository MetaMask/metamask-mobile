import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Asset from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Asset', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Asset transactions={[]} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
