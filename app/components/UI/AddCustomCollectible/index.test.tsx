import React, { ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialRootState from '../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockStore = configureMockStore();

const store = mockStore(initialRootState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => ''),
}));

const MockThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
);

describe('AddCustomCollectible', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <MockThemeProvider>
        <Provider store={store}>
          <AddCustomCollectible />
        </Provider>
      </MockThemeProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
