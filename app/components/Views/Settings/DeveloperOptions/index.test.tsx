import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import { backgroundState } from '../../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import DeveloperOptions from './';

const mockStore = configureMockStore();

const initialState = {
  DeveloperOptions: {},
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

const setOptions = jest.fn();

describe('DeveloperOptions', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <DeveloperOptions
            navigation={{
              setOptions,
            }}
            route={{}}
          />
          ,
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
