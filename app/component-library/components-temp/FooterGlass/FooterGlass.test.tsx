import React from 'react';
import { Text, processColor } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';

import FooterGlass from './FooterGlass';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../BoxGlass';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';
import { mockTheme } from '../../../util/theme';

let mockIsGlassEnabled = true;
jest.mock('../../hooks/useLiquidGlass', () => {
  const actual = jest.requireActual('../../hooks/useLiquidGlass');
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: mockIsGlassEnabled,
    }),
  };
});

const mockInsets = { top: 0, right: 0, bottom: 34, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => mockInsets,
}));

const PRIMARY_TEST_ID = 'footer-glass-primary';
const SECONDARY_TEST_ID = 'footer-glass-secondary';
const TERTIARY_TEST_ID = 'footer-glass-tertiary';

describe('FooterGlass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGlassEnabled = true;
  });

  it('renders nothing when no buttons are passed', () => {
    const { toJSON } = render(<FooterGlass />);

    expect(toJSON()).toBeNull();
  });

  it('stacks primary, secondary, and tertiary from top to bottom', () => {
    const { getByTestId, toJSON } = render(
      <FooterGlass
        primaryButtonProps={{
          children: 'Continue',
          onPress: jest.fn(),
          testID: PRIMARY_TEST_ID,
        }}
        secondaryButtonProps={{
          children: 'Cancel',
          onPress: jest.fn(),
          testID: SECONDARY_TEST_ID,
        }}
        tertiaryButtonProps={{
          children: 'Skip',
          onPress: jest.fn(),
          testID: TERTIARY_TEST_ID,
        }}
      />,
    );

    expect(getByTestId(PRIMARY_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(SECONDARY_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(TERTIARY_TEST_ID)).toBeOnTheScreen();

    const serialized = JSON.stringify(toJSON());
    const primaryIndex = serialized.indexOf(`"${PRIMARY_TEST_ID}"`);
    const secondaryIndex = serialized.indexOf(`"${SECONDARY_TEST_ID}"`);
    const tertiaryIndex = serialized.indexOf(`"${TERTIARY_TEST_ID}"`);

    expect(primaryIndex).toBeGreaterThan(-1);
    expect(secondaryIndex).toBeGreaterThan(primaryIndex);
    expect(tertiaryIndex).toBeGreaterThan(secondaryIndex);
  });

  it('skips an omitted button and keeps the remaining order', () => {
    const { getByTestId, queryByTestId, toJSON } = render(
      <FooterGlass
        primaryButtonProps={{
          children: 'Continue',
          onPress: jest.fn(),
          testID: PRIMARY_TEST_ID,
        }}
        tertiaryButtonProps={{
          children: 'Skip',
          onPress: jest.fn(),
          testID: TERTIARY_TEST_ID,
        }}
      />,
    );

    expect(getByTestId(PRIMARY_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(SECONDARY_TEST_ID)).not.toBeOnTheScreen();
    expect(getByTestId(TERTIARY_TEST_ID)).toBeOnTheScreen();

    const serialized = JSON.stringify(toJSON());

    expect(serialized.indexOf(`"${TERTIARY_TEST_ID}"`)).toBeGreaterThan(
      serialized.indexOf(`"${PRIMARY_TEST_ID}"`),
    );
  });

  it('draws glass on all buttons with a sheen only on the secondary', () => {
    const { getAllByTestId, getByText, UNSAFE_getAllByType } = render(
      <FooterGlass
        primaryButtonProps={{ children: 'Continue', onPress: jest.fn() }}
        secondaryButtonProps={{ children: 'Cancel', onPress: jest.fn() }}
        tertiaryButtonProps={{ children: 'Skip', onPress: jest.fn() }}
      />,
    );

    const glassSurfaces = UNSAFE_getAllByType(GlassView);
    const tintedSurfaces = glassSurfaces.filter(
      (node) => node.props.tintColor === mockTheme.colors.icon.default,
    );

    expect(glassSurfaces).toHaveLength(3);
    expect(tintedSurfaces).toHaveLength(1);
    expect(getAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(1);
    expect(getByText('Skip')).toBeOnTheScreen();
  });

  it('calls onPress for each button', () => {
    const onPrimaryPress = jest.fn();
    const onSecondaryPress = jest.fn();
    const onTertiaryPress = jest.fn();
    const { getByTestId } = render(
      <FooterGlass
        primaryButtonProps={{
          children: 'Continue',
          onPress: onPrimaryPress,
          testID: PRIMARY_TEST_ID,
        }}
        secondaryButtonProps={{
          children: 'Cancel',
          onPress: onSecondaryPress,
          testID: SECONDARY_TEST_ID,
        }}
        tertiaryButtonProps={{
          children: 'Skip',
          onPress: onTertiaryPress,
          testID: TERTIARY_TEST_ID,
        }}
      />,
    );

    fireEvent.press(getByTestId(PRIMARY_TEST_ID));
    fireEvent.press(getByTestId(SECONDARY_TEST_ID));
    fireEvent.press(getByTestId(TERTIARY_TEST_ID));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
    expect(onTertiaryPress).toHaveBeenCalledTimes(1);
  });

  it('fades the content above into the screen colour', () => {
    const { getByTestId, getByText } = render(
      <FooterGlass testID="footer">
        <Text>Buy</Text>
      </FooterGlass>,
    );

    expect(getByText('Buy')).toBeOnTheScreen();
    expect(getByTestId('footer-fade').props.colors).toEqual(
      [0, 0.35, 0.7, 1].map((opacity) =>
        processColor(
          colorWithOpacity(mockTheme.colors.background.default, opacity),
        ),
      ),
    );
    expect(getByTestId('footer-fade')).toHaveStyle({
      bottom: '100%',
    });
  });

  it('pads for the bottom inset only when asked', () => {
    const { getByTestId, rerender } = render(
      <FooterGlass testID="footer">
        <Text>Buy</Text>
      </FooterGlass>,
    );

    expect(getByTestId('footer')).not.toHaveStyle({ paddingBottom: 34 });

    rerender(
      <FooterGlass testID="footer" includesBottomInset>
        <Text>Buy</Text>
      </FooterGlass>,
    );

    expect(getByTestId('footer')).toHaveStyle({ paddingBottom: 34 });
  });

  it('floats at the bottom with the fade behind it when overlaid', () => {
    const { getByTestId } = render(
      <FooterGlass testID="footer" isOverlay>
        <Text>Buy</Text>
      </FooterGlass>,
    );

    expect(getByTestId('footer')).toHaveStyle({
      position: 'absolute',
      bottom: 0,
    });
    expect(getByTestId('footer-fade')).toHaveStyle({ top: -32, bottom: 0 });
  });

  it('leaves the fade without a test ID when the footer has none', () => {
    const { queryByTestId } = render(
      <FooterGlass>
        <Text>Buy</Text>
      </FooterGlass>,
    );

    expect(queryByTestId('undefined-fade')).toBeNull();
  });
});
