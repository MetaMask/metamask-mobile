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
    (props: WebsiteIconProps) => (
      <Component {...props} faviconSource="mockedFaviconSource.png" />
    ),
}));

describe('WebsiteIcon', () => {
  it('renders correctly when title and url are provided', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <WebsiteIcon title="title" url="url.com" />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when only title is provided', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <WebsiteIcon title="title" />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when title and url are null', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <WebsiteIcon title={null} url={null} />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when title is null and url is undefined', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <WebsiteIcon title={null} url={undefined} />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when title is null and url is provided', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <WebsiteIcon title={null} url="url.com" />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
