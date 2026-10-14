import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import PredictHeaderStacked from './PredictHeaderStacked';
import GlassCapsule from '../../../../../component-library/components-temp/GlassCapsule';
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
    HeaderStandardAnimated: ({
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

const sharedValue = (value: number): SharedValue<number> =>
  ({ value }) as unknown as SharedValue<number>;

const renderHeader = (
  props: Partial<React.ComponentProps<typeof PredictHeaderStacked>> = {},
) =>
  render(
    <PredictHeaderStacked
      scrollY={sharedValue(0)}
      titleSectionHeight={sharedValue(0)}
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

  describe('capsules', () => {
    it('seats back and search in capsules and keeps them pressable', () => {
      const onBack = jest.fn();
      const onSearchPress = jest.fn();
      const { UNSAFE_getAllByType } = renderHeader({
        isCapsule: true,
        onBack,
        onSearchPress,
      });

      expect(UNSAFE_getAllByType(GlassCapsule)).toHaveLength(2);

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

      expect(UNSAFE_queryAllByType(GlassCapsule)).toHaveLength(0);
    });
  });
});
