import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';

import FooterGlass from './FooterGlass';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../BoxGlass';
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

  it('draws glass on the primary and secondary buttons only', () => {
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

    expect(glassSurfaces).toHaveLength(2);
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
});
