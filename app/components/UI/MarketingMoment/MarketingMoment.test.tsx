import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import MarketingMoment from './MarketingMoment';
import type { MarketingMomentProps } from './MarketingMoment.types';

const testIds = {
  container: 'marketing-moment',
  title: 'marketing-moment-title',
  description: 'marketing-moment-description',
  artwork: 'marketing-moment-artwork',
  primaryButton: 'marketing-moment-primary-button',
  secondaryButton: 'marketing-moment-secondary-button',
} as const;

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    Theme: { Light: 'light', Dark: 'dark' },
    ThemeProvider: ({
      children,
      theme,
    }: {
      children?: React.ReactNode;
      theme?: string;
    }) =>
      ReactActual.createElement(
        NativeView,
        { testID: `theme-provider-${theme}` },
        children,
      ),
    useTailwind: () => ({
      style: (...inputs: unknown[]) => ({
        twClassName: inputs
          .filter((value) => typeof value === 'string')
          .join(' '),
      }),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(NativeView, null, children),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    View: NativeView,
    Text,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(NativeView, { testID }, children),
    Text: ({
      children,
      testID,
      accessibilityRole,
      twClassName,
      style,
    }: {
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
      twClassName?: string;
      style?: unknown;
    }) =>
      ReactActual.createElement(
        Text,
        { testID, accessibilityRole, twClassName, style },
        children,
      ),
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { onPress, testID },
        ReactActual.createElement(Text, null, children),
      ),
    ButtonSize: { Lg: 'lg' },
    ButtonVariant: { Primary: 'primary', Tertiary: 'tertiary' },
    FontFamily: { Hero: 'hero' },
    FontWeight: { Regular: 'regular', Bold: 'bold' },
    TextColor: { TextAlternative: 'text-alternative' },
    TextVariant: {
      DisplayXl: 'display-xl',
      DisplayLg: 'display-lg',
      DisplayMd: 'display-md',
      HeadingLg: 'heading-lg',
      HeadingMd: 'heading-md',
      HeadingSm: 'heading-sm',
      BodyMd: 'body-md',
    },
    BoxFlexDirection: { Column: 'column' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
  };
});

const onPrimaryPress = jest.fn();
const onSecondaryPress = jest.fn();

const renderMoment = (props: Partial<MarketingMomentProps> = {}) =>
  render(
    <MarketingMoment
      testID={testIds.container}
      title="Perps are here"
      titleProps={{ testID: testIds.title }}
      description="Long or short with up to 40x leverage."
      descriptionProps={{ testID: testIds.description }}
      primaryAction={{
        label: 'Get started',
        onPress: onPrimaryPress,
        testID: testIds.primaryButton,
      }}
      secondaryAction={{
        label: 'Not now',
        onPress: onSecondaryPress,
        testID: testIds.secondaryButton,
      }}
      {...props}
    />,
  );

describe('MarketingMoment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a string title as a header and a string description', () => {
    const { getByTestId } = renderMoment();

    expect(getByTestId(testIds.title)).toHaveTextContent('Perps are here');
    expect(getByTestId(testIds.title).props.accessibilityRole).toBe('header');
    expect(getByTestId(testIds.description)).toHaveTextContent(
      'Long or short with up to 40x leverage.',
    );
  });

  it('spreads titleProps and descriptionProps onto the text', () => {
    const { getByTestId } = renderMoment({
      titleProps: {
        testID: 'custom-title',
        twClassName: 'text-accent02-light',
      },
      descriptionProps: { testID: 'custom-description' },
    });

    expect(getByTestId('custom-title')).toHaveTextContent('Perps are here');
    expect(getByTestId('custom-title').props.twClassName).toBe(
      'w-full text-center',
    );
    expect(getByTestId('custom-title').props.style).toEqual([
      { twClassName: 'py-3 leading-[48px] tracking-[-1.2px] -mb-[12px]' },
      { twClassName: 'text-accent02-light' },
    ]);
    expect(getByTestId('custom-description')).toHaveTextContent(
      'Long or short with up to 40x leverage.',
    );
  });

  it('replaces the title and description text with custom nodes', () => {
    const { getByTestId, queryByTestId } = renderMoment({
      title: <View testID="custom-title-node" />,
      description: <View testID="custom-description-node" />,
    });

    expect(getByTestId('custom-title-node')).toBeOnTheScreen();
    expect(getByTestId('custom-description-node')).toBeOnTheScreen();
    expect(queryByTestId(testIds.title)).not.toBeOnTheScreen();
    expect(queryByTestId(testIds.description)).not.toBeOnTheScreen();
  });

  it('renders children in a wrapper that accepts animated view props', () => {
    const { getByTestId } = renderMoment({
      children: <View testID="marketing-moment-children" />,
      childrenWrapperAnimatedViewProps: { testID: 'children-wrapper' },
    });

    expect(getByTestId('children-wrapper')).toBeOnTheScreen();
    expect(getByTestId('marketing-moment-children')).toBeOnTheScreen();
  });

  it('renders the artwork in a box that accepts props', () => {
    const { getByTestId } = renderMoment({
      artwork: <View testID="marketing-moment-custom-art" />,
      artworkWrapperProps: { testID: 'artwork-wrapper' },
    });

    expect(getByTestId('artwork-wrapper')).toBeOnTheScreen();
    expect(getByTestId('marketing-moment-custom-art')).toBeOnTheScreen();
  });

  it('renders the artwork in an animated view that accepts props', () => {
    const { getByTestId } = renderMoment({
      artwork: <View testID="marketing-moment-custom-art" />,
      artworkWrapperAnimatedViewProps: { testID: 'artwork-animated-wrapper' },
    });

    expect(getByTestId('artwork-animated-wrapper')).toBeOnTheScreen();
    expect(getByTestId('marketing-moment-custom-art')).toBeOnTheScreen();
  });

  it('calls the primary action when pressed', () => {
    const { getByTestId } = renderMoment();

    fireEvent.press(getByTestId(testIds.primaryButton));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
  });

  it('calls the not now action when pressed', () => {
    const { getByTestId } = renderMoment();

    fireEvent.press(getByTestId(testIds.secondaryButton));

    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });

  it('omits every slot that is not provided', () => {
    const { getByTestId, queryByTestId } = renderMoment({
      title: undefined,
      description: undefined,
      primaryAction: undefined,
      secondaryAction: undefined,
    });

    expect(getByTestId(testIds.container)).toBeOnTheScreen();
    expect(queryByTestId(testIds.title)).not.toBeOnTheScreen();
    expect(queryByTestId(testIds.description)).not.toBeOnTheScreen();
    expect(queryByTestId(testIds.artwork)).not.toBeOnTheScreen();
    expect(queryByTestId(testIds.primaryButton)).not.toBeOnTheScreen();
    expect(queryByTestId(testIds.secondaryButton)).not.toBeOnTheScreen();
  });

  it('renders a page background and forced theme when provided', () => {
    const { getByTestId } = renderMoment({
      background: <View testID="marketing-moment-background" />,
      theme: 'dark' as MarketingMomentProps['theme'],
    });

    expect(getByTestId('marketing-moment-background')).toBeOnTheScreen();
    expect(getByTestId('theme-provider-dark')).toBeOnTheScreen();
  });
});
