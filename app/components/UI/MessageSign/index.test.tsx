import React from 'react';
import { render } from '@testing-library/react-native';
import MessageSign from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x0',
      },
    },
  },
};
const store = mockStore(initialState);

describe('MessageSign', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <MessageSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={{ data: 'message' }}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
