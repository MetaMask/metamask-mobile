import React from 'react';
import TabCountIcon from './';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { BrowserViewSelectorsIDs } from '../../../Views/BrowserTab/BrowserView.testIds';

const mockStore = configureMockStore();
const initialState = {
  browser: {
    tabs: [{ url: 'https://metamask.io' }],
  },
};
const store = mockStore(initialState);

describe('TabCountIcon', () => {
  it('shows the tab count from Redux state', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <TabCountIcon />
        </ThemeContext.Provider>
      </Provider>,
    );
    const countLabel = getByTestId(BrowserViewSelectorsIDs.TABS_NUMBER);
    expect(countLabel).toBeOnTheScreen();
    expect(countLabel.props.children).toBe(1);
  });
});
