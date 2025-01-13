import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DefaultUrlAutocomplete, { UrlAutocomplete } from './';
import { render } from '@testing-library/react-native';
import { mockTheme, ThemeContext } from '../../../util/theme';

describe('UrlAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<DefaultUrlAutocomplete />, {});
    expect(toJSON()).toMatchSnapshot();
  });

  it('should show sites from dapp list', () => {
    jest.useFakeTimers();
    const { update, findByText } = render(<UrlAutocomplete browserHistory={[]} bookmarks={[]} />, { wrapper: ({ children }) => <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>});
    update(<UrlAutocomplete input="uni" browserHistory={[]} bookmarks={[]} />);
    jest.runAllTimers();
    expect(findByText("Uniswap")).toBeDefined();
    jest.useRealTimers();
  });
});
