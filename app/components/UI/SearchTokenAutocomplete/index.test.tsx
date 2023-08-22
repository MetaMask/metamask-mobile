import React from 'react';
import { shallow } from 'enzyme';
import SearchTokenAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: initialBackgroundState,
  },
});

describe('SearchTokenAutocomplete', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SearchTokenAutocomplete navigation={{}} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
