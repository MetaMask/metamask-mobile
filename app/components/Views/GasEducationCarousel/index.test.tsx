import React from 'react';
import { render } from '@testing-library/react-native';
import GasEducationCarousel from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const store = mockStore({});

describe('GasEducationCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <GasEducationCarousel navigation={{ getParam: () => false }} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
