import React from 'react';
import { render } from '@testing-library/react-native';
import Onboarding from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Onboarding', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Onboarding />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
