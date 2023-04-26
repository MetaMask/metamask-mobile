import React from 'react';
import { render } from '@testing-library/react-native';
import UrlAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ROPSTEN } from '../../../constants/network';

const mockStore = configureMockStore();
const store = mockStore({});

describe('UrlAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <UrlAutocomplete network={ROPSTEN} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
