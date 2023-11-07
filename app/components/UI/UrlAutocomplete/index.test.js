import React from 'react';
import { shallow } from 'enzyme';
import UrlAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('UrlAutocomplete', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <UrlAutocomplete />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
