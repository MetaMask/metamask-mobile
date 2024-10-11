import React from 'react';
import { render } from '@testing-library/react-native';
import WebsiteIcon from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

interface WebsiteIconProps {
  style: object;
  viewStyle: object;
  textStyle: object;
  title: string;
  url: string;
  transparent: boolean;
  icon: string | object;
  faviconSource: string;
}

// Mock the HOC
jest.mock('../../hooks/useFavicon/withFaviconAwareness', () => ({
  __esModule: true,
  default:
    (Component: React.ComponentType<WebsiteIconProps>) =>
    (props: WebsiteIconProps) =>
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
