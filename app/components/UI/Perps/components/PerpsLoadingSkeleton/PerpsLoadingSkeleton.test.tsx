import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render } from '@testing-library/react-native';
import PerpsLoadingSkeleton from './PerpsLoadingSkeleton';

// Mock the theme hook
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        muted: '#6B7280',
      },
    },
  }),
}));

// Mock the Tailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((classes) => {
      // Simple mock that returns basic style objects
      if (classes.includes('mb-6')) {
        return { marginBottom: 24 };
      }
      return {};
    }),
  }),
}));

// Mock the i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.connection.connecting_to_perps': 'Connecting to Perps...',
      'perps.connection.perps_will_be_available_shortly':
        'Perps will be available shortly',
    };
    return translations[key] || key;
  },
}));

// Mock the design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Box: ({ children, testID, ...props }: any) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Text: ({ children, testID, ...props }: any) => (
      <RNText testID={testID} {...props}>
        {children}
      </RNText>
    ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Center: 'center',
    },
  };
});

describe('PerpsLoadingSkeleton', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(<PerpsLoadingSkeleton />);

    const skeleton = getByTestId('perps-loading-skeleton');
    expect(skeleton).toBeDefined();
  });

  it('should render with custom testID', () => {
    const customTestId = 'custom-skeleton';
    const { getByTestId } = render(
      <PerpsLoadingSkeleton testID={customTestId} />,
    );

    const skeleton = getByTestId(customTestId);
    expect(skeleton).toBeDefined();
  });

  it('should render loading spinner', () => {
    const { UNSAFE_getByType } = render(<PerpsLoadingSkeleton />);

    const activityIndicator = UNSAFE_getByType(ActivityIndicator);
    expect(activityIndicator).toBeDefined();
    expect(activityIndicator.props.size).toBe('large');
    // Color comes from theme, just check it exists
    expect(activityIndicator.props.color).toBeDefined();
  });

  it('should render connecting text', () => {
    const { getByText } = render(<PerpsLoadingSkeleton />);

    const connectingText = getByText('Connecting to Perps...');
    expect(connectingText).toBeDefined();
  });

  it('should render availability text', () => {
    const { getByText } = render(<PerpsLoadingSkeleton />);

    const availabilityText = getByText('Perps will be available shortly');
    expect(availabilityText).toBeDefined();
  });

  it('should match snapshot', () => {
    const { toJSON } = render(<PerpsLoadingSkeleton />);
    expect(toJSON()).toMatchSnapshot();
  });
});
