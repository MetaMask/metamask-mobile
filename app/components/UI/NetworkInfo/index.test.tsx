import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NetworkInfo from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  privacy: {
    approvedHosts: {},
  },
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

describe('NetworkInfo', () => {
  it('should render correctly', () => {
    render(
      <Provider store={store}>
        <NetworkInfo
          type={''}
          onClose={function (): void {
            throw new Error('Function not implemented.');
          }}
          ticker={''}
        />
      </Provider>,
    );
    expect(screen.getByText('Network Info')).toBeTruthy();
  });
});
