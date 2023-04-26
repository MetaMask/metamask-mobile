import React from 'react';
import { render } from '@testing-library/react-native';
import SearchTokenAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: {
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
});

describe('SearchTokenAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <SearchTokenAutocomplete navigation={{}} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
