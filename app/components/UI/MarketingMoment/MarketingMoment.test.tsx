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
    FontWeight: { Bold: 'bold' },
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

  it('renders the title as a header with one description', () => {
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

  it('renders two description paragraphs', () => {
    const { getByTestId } = renderMoment({
      description: [
        'It should arrive in 4 to 6 weeks.',
        'Set up your virtual card.',
      ],
    });

    expect(
      getByTestId(`${MarketingMomentSelectorsIDs.DESCRIPTION}-0`),
    ).toHaveTextContent('It should arrive in 4 to 6 weeks.');
    expect(
      getByTestId(`${MarketingMomentSelectorsIDs.DESCRIPTION}-1`),
    ).toHaveTextContent('Set up your virtual card.');
  });

  it('renders supporting content and artwork', () => {
    const { getByTestId } = renderMoment({
      supportingContent: <View testID="marketing-moment-supporting" />,
      artwork: <View testID="marketing-moment-custom-art" />,
    });

    expect(getByTestId('marketing-moment-supporting')).toBeOnTheScreen();
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

  it('renders a page background and forced theme when provided', () => {
    const { getByTestId } = renderMoment({
      background: <View testID="marketing-moment-background" />,
      theme: 'dark' as MarketingMomentProps['theme'],
    });

    expect(getByTestId('marketing-moment-background')).toBeOnTheScreen();
    expect(getByTestId('theme-provider-dark')).toBeOnTheScreen();
  });
});
