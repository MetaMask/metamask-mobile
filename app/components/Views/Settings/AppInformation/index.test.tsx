import React from 'react';
import { render } from '@testing-library/react-native';
import AppInformation from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('AppInformation', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AppInformation route={{ params: {} }} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
