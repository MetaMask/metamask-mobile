import React from 'react';
import TabCountIcon from './';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  browser: {
    tabs: [{ url: 'https://metamask.io' }],
  },
};
const store = mockStore(initialState);

describe('TabCountIcon', () => {
  it('should render correctly', () => {
    // eslint-disable-next-line react/jsx-no-bind
    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <TabCountIcon />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
