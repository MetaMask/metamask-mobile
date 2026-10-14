import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import MarketingMoment from './MarketingMoment';
import { MarketingMomentSelectorsIDs } from './MarketingMoment.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    SafeAreaView: ({
      children,
    }: {
      children?: React.ReactNode;
    }) => ReactActual.createElement(NativeView, null, children),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView, Text, TouchableOpacity } =
    jest.requireActual('react-native');

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
    FontWeight: { Bold: 'bold', Medium: 'medium', Regular: 'regular' },
    TextColor: { TextAlternative: 'text-alternative' },
    TextVariant: { DisplayMd: 'display-md', BodyMd: 'body-md' },
    BoxFlexDirection: { Column: 'column' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
  };
});

describe('MarketingMoment', () => {
  const onPrimaryPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one description under the title', () => {
    const { getByTestId } = render(
      <MarketingMoment
        title="Perps are here"
        description="Long or short with up to 40x leverage."
        primaryAction={{ label: 'Get started', onPress: onPrimaryPress }}
      />,
    );

    expect(getByTestId(MarketingMomentSelectorsIDs.TITLE)).toHaveTextContent(
      'Perps are here',
    );
    expect(
      getByTestId(MarketingMomentSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent('Long or short with up to 40x leverage.');
    expect(
      getByTestId(MarketingMomentSelectorsIDs.TITLE).props.accessibilityRole,
    ).toBe('header');
  });

  it('renders two description paragraphs', () => {
    const { getByTestId } = render(
      <MarketingMoment
        title="Your card is ordered"
        description={[
          'It should arrive in 4 to 6 weeks.',
          'Set up your virtual card.',
        ]}
        primaryAction={{ label: 'Set up card', onPress: onPrimaryPress }}
      />,
    );

    expect(
      getByTestId(`${MarketingMomentSelectorsIDs.DESCRIPTION}-0`),
    ).toHaveTextContent('It should arrive in 4 to 6 weeks.');
    expect(
      getByTestId(`${MarketingMomentSelectorsIDs.DESCRIPTION}-1`),
    ).toHaveTextContent('Set up your virtual card.');
  });

  it('renders caller artwork in the flexible region', () => {
    const { getByTestId } = render(
      <MarketingMoment
        title="Spend and earn"
        description="Spend crypto and earn mUSD back."
        artwork={<View testID="marketing-moment-custom-art" />}
        primaryAction={{ label: 'Set up now', onPress: onPrimaryPress }}
      />,
    );

    expect(getByTestId('marketing-moment-custom-art')).toBeOnTheScreen();
    expect(getByTestId(MarketingMomentSelectorsIDs.ARTWORK)).toBeOnTheScreen();
  });

  it('calls the primary action when its button is pressed', () => {
    const { getByTestId } = render(
      <MarketingMoment
        title="You're in!"
        description="Finish setting up your card."
        primaryAction={{
          label: 'Finish setup',
          onPress: onPrimaryPress,
          testID: 'finish-setup',
        }}
      />,
    );

    fireEvent.press(getByTestId('finish-setup'));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
  });

  it('calls the second action when it is provided', () => {
    const onSecondaryPress = jest.fn();
    const { getByTestId } = render(
      <MarketingMoment
        title="Spend and earn"
        description="Spend crypto and earn mUSD back."
        primaryAction={{ label: 'Set up now', onPress: onPrimaryPress }}
        secondaryAction={{
          label: 'Not now',
          onPress: onSecondaryPress,
          testID: MarketingMomentSelectorsIDs.SECONDARY_BUTTON,
        }}
      />,
    );

    fireEvent.press(getByTestId(MarketingMomentSelectorsIDs.SECONDARY_BUTTON));

    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });

  it('omits the second action when it is not provided', () => {
    const { queryByTestId } = render(
      <MarketingMoment
        title="You're in!"
        description="Finish setting up your card."
        primaryAction={{ label: 'Finish setup', onPress: onPrimaryPress }}
      />,
    );

    expect(
      queryByTestId(MarketingMomentSelectorsIDs.SECONDARY_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
