import React from 'react';
import { render } from '@testing-library/react-native';
import WebsiteIcon from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

// Mock the HOC
jest.mock('../../hooks/useFavicon/withFaviconAwareness', () => ({
  __esModule: true,
  default: (Component) => (props) =>
    <Component {...props} faviconSource="mockedFaviconSource.png" />,
}));

describe('WebsiteIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <WebsiteIcon title="title" url="url.com" />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
