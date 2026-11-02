import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import HomeHeaderToContent from './HomeHeaderToContent';
import HomeSectionGapControl, {
  HomeSectionGapControlImpl,
  isHomeSectionGapControlEnabled,
} from './HomeSectionGapControl';
import HomepageSectionDivider from './HomepageSectionDivider';
import {
  HOME_HEADER_TO_CONTENT_TEST_ID,
  HOME_SECTION_GAP_CONTROL_TEST_ID,
  homeHeaderToContentClassName,
  homeSectionDividerMarginStep,
  homeSectionGapOptionTestId,
  parseHomeSectionGapSelection,
} from './homeSectionGap';
import {
  getHomeSectionGapSelection,
  resetHomeSectionGapSelection,
  setHomeSectionGapSelection,
} from './homeSectionGapStore';

/**
 * Unit coverage for the dev-only gap math and the two small components that
 * apply it. Component-view is the wrong layer: the control is review chrome
 * with no Redux screen state, and the default export stays unmounted under
 * Jest. There is no controller seam and no device boundary.
 */

const mockSectionDivider = jest.fn(
  (_props: { marginVertical?: number }) => null,
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');

  return {
    ...actualDesignSystem,
    Box: ({
      children,
      testID,
      twClassName,
    }: {
      children?: React.ReactNode;
      testID?: string;
      twClassName?: string;
    }) => (
      <View accessibilityLabel={twClassName} testID={testID}>
        {children}
      </View>
    ),
    Text: ({ children }: { children?: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
    SectionDivider: (props: { marginVertical?: number }) =>
      mockSectionDivider(props),
    SegmentedControl: ({
      children,
      onChange,
      testID,
      value,
    }: {
      children: React.ReactNode;
      onChange: (value: string) => void;
      testID?: string;
      value: string;
    }) => (
      <View accessibilityLabel={value} testID={testID}>
        {ReactActual.Children.map(children, (child: React.ReactNode) => {
          if (
            !ReactActual.isValidElement<{
              onPress?: () => void;
              value: string;
            }>(child)
          ) {
            return child;
          }

          return ReactActual.cloneElement(child, {
            onPress: () => onChange(child.props.value),
          });
        })}
      </View>
    ),
    FilterButton: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('home section gap', () => {
  beforeEach(() => {
    mockSectionDivider.mockClear();
    resetHomeSectionGapSelection();
  });

  it('keeps the production divider margin at 20px', () => {
    const step = homeSectionDividerMarginStep('production');

    expect(step).toBe(5);
    expect(getHomeSectionGapSelection()).toBe('production');
  });

  it('maps 8, 12, 16, and 24 onto Box steps 2, 3, 4, and 6', () => {
    expect(homeSectionDividerMarginStep(8)).toBe(2);
    expect(homeSectionDividerMarginStep(12)).toBe(3);
    expect(homeSectionDividerMarginStep(16)).toBe(4);
    expect(homeSectionDividerMarginStep(24)).toBe(6);
  });

  it('pulls the first section up by 4px so the header gap is 16px at the 20px divider', () => {
    const className = homeHeaderToContentClassName('production');

    expect(className).toBe('-mt-1');
  });

  it('offsets the header gap when the between-section margin changes', () => {
    expect(homeHeaderToContentClassName(8)).toBe('mt-2');
    expect(homeHeaderToContentClassName(12)).toBe('mt-1');
    expect(homeHeaderToContentClassName(16)).toBeUndefined();
    expect(homeHeaderToContentClassName(24)).toBe('-mt-2');
  });

  it('accepts only the review segment values', () => {
    expect(parseHomeSectionGapSelection('production')).toBe('production');
    expect(parseHomeSectionGapSelection('16')).toBe(16);
    expect(parseHomeSectionGapSelection('20')).toBeUndefined();
  });

  it('leaves the section line on the design-system default in production', () => {
    render(<HomepageSectionDivider />);

    expect(mockSectionDivider).toHaveBeenCalledWith(
      expect.not.objectContaining({ marginVertical: expect.anything() }),
    );
  });

  it('sets the section line margin to 24px when that review value is selected', () => {
    setHomeSectionGapSelection(24);

    render(<HomepageSectionDivider />);

    expect(mockSectionDivider).toHaveBeenCalledWith(
      expect.objectContaining({ marginVertical: 6 }),
    );
  });

  it('applies the 16px header adjustment class on the sections wrapper', () => {
    const { getByTestId } = render(
      <HomeHeaderToContent>
        <></>
      </HomeHeaderToContent>,
    );

    expect(
      getByTestId(HOME_HEADER_TO_CONTENT_TEST_ID).props.accessibilityLabel,
    ).toBe('-mt-1');
  });

  it('omits the review control in Jest', () => {
    const { queryByTestId } = render(<HomeSectionGapControl />);

    expect(isHomeSectionGapControlEnabled).toBe(false);
    expect(queryByTestId(HOME_SECTION_GAP_CONTROL_TEST_ID)).toBeNull();
  });

  it('switches the between-section gap from the review control', () => {
    const { getByTestId } = render(<HomeSectionGapControlImpl />);

    fireEvent.press(getByTestId(homeSectionGapOptionTestId(16)));

    expect(getHomeSectionGapSelection()).toBe(16);
    expect(getByTestId('home-section-gap-option-16')).toBeOnTheScreen();
  });

  it('returns the review control to the 20px production gap', () => {
    setHomeSectionGapSelection(8);
    const { getByTestId } = render(<HomeSectionGapControlImpl />);

    fireEvent.press(getByTestId(homeSectionGapOptionTestId('production')));

    expect(getHomeSectionGapSelection()).toBe('production');
  });
});
