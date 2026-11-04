import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import PredictHeaderStacked from './PredictHeaderStacked';
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';
import { PREDICT_HEADER_STACKED_TEST_IDS } from './PredictHeaderStacked.testIds';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
} from '../../Predict.testIds';

// Mock the design system header so the test is deterministic and free of
// reanimated worklets / tailwind providers. The mock renders the props the
// wrapper is responsible for wiring (title, back, end icons).
jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    IconName: { Search: 'Search', ArrowLeft: 'ArrowLeft' },
    ButtonIconSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg' },
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    Box: ({ children }: { children?: React.ReactNode }) => (
      <ReactNative.View>{children}</ReactNative.View>
    ),
    ButtonIcon: ({
      iconName,
      onPress,
      testID,
    }: {
      iconName: string;
      onPress?: () => void;
      testID?: string;
    }) => (
      <ReactNative.TouchableOpacity testID={testID} onPress={onPress}>
        <ReactNative.Text>{iconName}</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    ),
    // Accessories take precedence over the shorthand props, as in HeaderBase.
    HeaderStandard: ({
      title,
      titleProps,
      onBack,
      backButtonProps,
      endButtonIconProps,
      startAccessory,
      endAccessory,
      testID,
    }: {
      title?: string;
      titleProps?: { testID?: string };
      onBack?: () => void;
      backButtonProps?: { testID?: string };
      endButtonIconProps?: {
        iconName: string;
        onPress?: () => void;
        testID?: string;
      }[];
      startAccessory?: React.ReactNode;
      endAccessory?: React.ReactNode;
      testID?: string;
    }) => (
      <ReactNative.View testID={testID}>
        <ReactNative.Text testID={titleProps?.testID}>{title}</ReactNative.Text>
        {startAccessory ?? (
          <ReactNative.TouchableOpacity
            testID={backButtonProps?.testID}
            onPress={onBack}
          >
            <ReactNative.Text>back</ReactNative.Text>
          </ReactNative.TouchableOpacity>
        )}
        {endAccessory ??
          endButtonIconProps?.map((iconProps) => (
            <ReactNative.TouchableOpacity
              key={iconProps.iconName}
              testID={iconProps.testID}
              onPress={iconProps.onPress}
            >
              <ReactNative.Text>{iconProps.iconName}</ReactNative.Text>
            </ReactNative.TouchableOpacity>
          ))}
      </ReactNative.View>
    ),
  };
});

// The venue picker is a PredictNext module with its own view tests; here it
// only has to sit in the header with the right variant.
jest.mock('../../../PredictNext/venueSelection', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    PredictVenueSelectorButton: ({ variant }: { variant: string }) => (
      <ReactNative.Text testID="venue-selector-stub">
        {variant}
      </ReactNative.Text>
    ),
  };
});

const sharedValue = (value: number): SharedValue<number> =>
  ({ value }) as unknown as SharedValue<number>;

const renderHeader = (
  props: Partial<React.ComponentProps<typeof PredictHeaderStacked>> = {},
) =>
  render(
    <PredictHeaderStacked
      scrollY={sharedValue(0)}
      onBack={jest.fn()}
      onSearchPress={jest.fn()}
      {...props}
    />,
  );

describe('PredictHeaderStacked', () => {
  it('renders the default "Predictions" title and the header container', () => {
    renderHeader();

    expect(
      screen.getByTestId(PREDICT_HEADER_STACKED_TEST_IDS.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PREDICT_HEADER_STACKED_TEST_IDS.COMPACT_TITLE),
    ).toHaveTextContent('Predictions');
  });

  it('renders a custom title when provided', () => {
    renderHeader({ title: 'World Cup' });

    expect(
      screen.getByTestId(PREDICT_HEADER_STACKED_TEST_IDS.COMPACT_TITLE),
    ).toHaveTextContent('World Cup');
  });

  it('calls onBack when the back button is pressed', () => {
    const onBack = jest.fn();
    renderHeader({ onBack });

    fireEvent.press(
      screen.getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON),
    );

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onSearchPress when the search icon is pressed', () => {
    const onSearchPress = jest.fn();
    renderHeader({ onSearchPress });

    fireEvent.press(
      screen.getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
    );

    expect(onSearchPress).toHaveBeenCalledTimes(1);
  });

  it('places the venue picker before the search icon', () => {
    renderHeader();

    const icons = screen.getAllByTestId(
      /venue-selector-stub|predict-search-button/,
    );
    expect(icons.map((icon) => icon.props.testID)).toStrictEqual([
      'venue-selector-stub',
      PredictSearchSelectorsIDs.SEARCH_BUTTON,
    ]);
    expect(screen.getByTestId('venue-selector-stub')).toHaveTextContent(
      'standard',
    );
  });

  it('renders the glass venue picker in the glass header', () => {
    renderHeader({ isGlass: true });

    expect(screen.getByTestId('venue-selector-stub')).toHaveTextContent(
      'glass',
    );
  });

  describe('capsules', () => {
    it('seats back and search in capsules and keeps them pressable', () => {
      const onBack = jest.fn();
      const onSearchPress = jest.fn();
      const { UNSAFE_getAllByType } = renderHeader({
        isGlass: true,
        onBack,
        onSearchPress,
      });

      expect(UNSAFE_getAllByType(CapsuleGlass)).toHaveLength(2);

      fireEvent.press(
        screen.getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON),
      );
      fireEvent.press(
        screen.getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
      );

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onSearchPress).toHaveBeenCalledTimes(1);
    });

    it('keeps the plain header icons by default', () => {
      const { UNSAFE_queryAllByType } = renderHeader();

      expect(UNSAFE_queryAllByType(CapsuleGlass)).toHaveLength(0);
    });
  });
});
