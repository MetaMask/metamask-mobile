import React from 'react';
import { shallow } from 'enzyme';
import UrlAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { SEPOLIA } from '../../../constants/network';

const mockStore = configureMockStore();
const store = mockStore({});

describe('UrlAutocomplete', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <UrlAutocomplete network={SEPOLIA} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
