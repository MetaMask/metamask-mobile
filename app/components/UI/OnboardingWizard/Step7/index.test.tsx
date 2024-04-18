import React from 'react';
import { render } from '@testing-library/react-native';
import Step7 from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Step7', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Step7 />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
