import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock dependencies BEFORE imports
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} data-classname={twClassName} {...props}>
        {children}
      </View>
    ),
    Text: ({
      children,
      testID,
      variant,
      twClassName,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      variant?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) => (
      <RNText
        testID={testID}
        data-variant={variant}
        data-classname={twClassName}
        {...props}
      >
        {children}
      </RNText>
    ),
    Icon: ({
      testID,
      name,
      size,
    }: {
      testID?: string;
      name?: string;
      size?: string;
    }) => (
      <RNText testID={testID} data-icon-name={name} data-icon-size={size}>
        Icon
      </RNText>
    ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    IconName: {
      Arrow2UpRight: 'Arrow2UpRight',
    },
    IconSize: {
      Md: 'Md',
    },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args: unknown[]) => {
      const flatArgs = args.flat().filter(Boolean);
      return flatArgs.reduce((acc: Record<string, unknown>, arg) => {
        if (typeof arg === 'string') {
          return { ...acc, [arg]: true };
        }
        if (typeof arg === 'object') {
          return { ...acc, ...arg };
        }
        return acc;
      }, {});
    }),
  }),
}));

jest.mock('../../../../../component-library/components/Tags/Tag', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ label, testID }) => (
      <ReactNative.View testID={testID || 'tag'}>
        <ReactNative.Text>{label}</ReactNative.Text>
      </ReactNative.View>
    )),
  };
});

// Import after mocks
import SiteRowItem, { type SiteData } from './SiteRowItem';

describe('SiteRowItem', () => {
  const mockOnPress = jest.fn();

  const createSite = (overrides: Partial<SiteData> = {}): SiteData => ({
    id: 'site-1',
    name: 'MetaMask',
    url: 'https://metamask.io',
    displayUrl: 'metamask.io',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders site name', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('MetaMask')).toBeOnTheScreen();
    });

    it('renders display URL', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('metamask.io')).toBeOnTheScreen();
    });

    it('renders site logo when logoUrl is provided', () => {
      const site = createSite({ logoUrl: 'https://example.com/logo.png' });

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      const image = getByTestId('site-logo-image');
      expect(image).toBeOnTheScreen();
      expect(image.props.source.uri).toBe('https://example.com/logo.png');
    });

    it('renders fallback emoji when logoUrl is not provided', () => {
      const site = createSite({ logoUrl: undefined });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('🌐')).toBeOnTheScreen();
    });

    it('renders featured badge when site is featured', () => {
      const site = createSite({ featured: true });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('Featured')).toBeOnTheScreen();
    });

    it('does not render featured badge when site is not featured', () => {
      const site = createSite({ featured: false });

      const { queryByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(queryByText('Featured')).toBeNull();
    });
  });

  describe('padding behavior', () => {
    it('renders with isViewAll prop set to true', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} isViewAll />,
      );

      const pressable = getByTestId('site-row-item');
      expect(pressable).toBeOnTheScreen();
      // Component renders successfully with isViewAll={true}
    });

    it('renders with isViewAll prop set to false', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} isViewAll={false} />,
      );

      const pressable = getByTestId('site-row-item');
      expect(pressable).toBeOnTheScreen();
      // Component renders successfully with isViewAll={false}
    });

    it('renders with isViewAll prop not provided', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      const pressable = getByTestId('site-row-item');
      expect(pressable).toBeOnTheScreen();
      // Component renders successfully with default isViewAll
    });
  });

  describe('interaction', () => {
    it('calls onPress when pressed', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('is pressable and interactive', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      const pressable = getByTestId('site-row-item');
      expect(pressable).toBeOnTheScreen();

      // Verify it's a touchable element by checking it has onPress
      fireEvent.press(pressable);
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('renders site with empty displayUrl', () => {
      const site = createSite({ displayUrl: '' });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('MetaMask')).toBeOnTheScreen();
    });

    it('renders site with long name', () => {
      const site = createSite({
        name: 'This is a very long site name that should be displayed correctly',
      });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(
        getByText(
          'This is a very long site name that should be displayed correctly',
        ),
      ).toBeOnTheScreen();
    });

    it('renders site with special characters in URL', () => {
      const site = createSite({
        displayUrl: 'metamask.io/portfolio?utm_source=mobile',
      });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(
        getByText('metamask.io/portfolio?utm_source=mobile'),
      ).toBeOnTheScreen();
    });
  });
});
