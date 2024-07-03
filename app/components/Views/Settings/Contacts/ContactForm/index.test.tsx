import React from 'react';
import { render } from '@testing-library/react-native';
import ContactForm from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('ContactForm', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ContactForm />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
