import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import MarketingMoment from './MarketingMoment';
import { MarketingMomentSelectorsIDs } from './MarketingMoment.testIds';
import type { MarketingMomentProps } from './MarketingMoment.types';

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
      style: jest.fn(() => ({})),
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
    }: {
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
    }) =>
      ReactActual.createElement(Text, { testID, accessibilityRole }, children),
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
    TextVariant: { DisplayLg: 'display-lg', BodyMd: 'body-md' },
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
      title="Perps are here"
      description="Long or short with up to 40x leverage."
      primaryAction={{
        label: 'Get started',
        onPress: onPrimaryPress,
        testID: MarketingMomentSelectorsIDs.PRIMARY_BUTTON,
      }}
      secondaryAction={{
        label: 'Not now',
        onPress: onSecondaryPress,
        testID: MarketingMomentSelectorsIDs.SECONDARY_BUTTON,
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

    expect(getByTestId(MarketingMomentSelectorsIDs.TITLE)).toHaveTextContent(
      'Perps are here',
    );
    expect(
      getByTestId(MarketingMomentSelectorsIDs.TITLE).props.accessibilityRole,
    ).toBe('header');
    expect(
      getByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent('Long or short with up to 40x leverage.');
  });

  it('spreads titleProps and descriptionProps onto the text', () => {
    const { getByTestId } = renderMoment({
      titleProps: { testID: 'custom-title' },
      descriptionProps: { testID: 'custom-description' },
    });

    expect(getByTestId('custom-title')).toHaveTextContent('Perps are here');
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
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.TITLE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
    ).not.toBeOnTheScreen();
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

  it('calls the primary action when pressed', () => {
    const { getByTestId } = renderMoment();

    fireEvent.press(getByTestId(MarketingMomentSelectorsIDs.PRIMARY_BUTTON));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
  });

  it('calls the not now action when pressed', () => {
    const { getByTestId } = renderMoment();

    fireEvent.press(getByTestId(MarketingMomentSelectorsIDs.SECONDARY_BUTTON));

    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });

  it('omits every slot that is not provided', () => {
    const { getByTestId, queryByTestId } = renderMoment({
      title: undefined,
      description: undefined,
      primaryAction: undefined,
      secondaryAction: undefined,
    });

    expect(
      getByTestId(MarketingMomentSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.TITLE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.ARTWORK),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.PRIMARY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MarketingMomentSelectorsIDs.SECONDARY_BUTTON),
    ).not.toBeOnTheScreen();
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
