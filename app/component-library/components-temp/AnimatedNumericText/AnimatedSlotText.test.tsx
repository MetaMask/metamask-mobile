import React from 'react';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { FontWeight, TextVariant } from '@metamask/design-system-react-native';

import AnimatedSlotText from './AnimatedSlotText';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));

const mockTwStyle = jest.fn();
let mockTextStyle: { lineHeight?: number } = {};

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: string[]) => {
      mockTwStyle(...classes);
      return mockTextStyle;
    },
  }),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);

describe('AnimatedSlotText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTextStyle = {};
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('rolls the numeric run and leaves the prefix and suffix still', () => {
    const { getByText } = render(
      <AnimatedSlotText value="$ 250.00 available" />,
    );

    expect(getByText('$ ')).toBeOnTheScreen();
    expect(getByText('250.00')).toBeOnTheScreen();
    expect(getByText('250.00')).not.toHaveStyle({
      fontVariant: ['tabular-nums'],
    });
    expect(getByText(' available')).toBeOnTheScreen();
  });

  it('renders the latest formatted value', () => {
    const { rerender, getByText } = render(
      <AnimatedSlotText value="$123.45" />,
    );

    rerender(<AnimatedSlotText value="$456.78" />);

    expect(getByText('456.78')).toBeOnTheScreen();
  });

  it('swaps the whole string when animation is off', () => {
    const { getByText, queryByText } = render(
      <AnimatedSlotText animated={false} value="$123.45" />,
    );

    expect(getByText('$123.45')).toBeOnTheScreen();
    expect(queryByText('123.45')).toBeNull();
  });

  it('swaps the whole string when the system reduced-motion setting is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByText, queryByText } = render(
      <AnimatedSlotText value="$123.45" />,
    );

    expect(getByText('$123.45')).toBeOnTheScreen();
    expect(queryByText('123.45')).toBeNull();
  });

  it('exposes one accessibility label for the full formatted string', () => {
    const { getAllByLabelText } = render(
      <AnimatedSlotText testID="slot" value="+$3K" />,
    );

    expect(getAllByLabelText('+$3K')).toHaveLength(1);
  });

  it('applies the requested variant and medium face', () => {
    const { getByText } = render(
      <AnimatedSlotText
        fontWeight={FontWeight.Medium}
        value="$10"
        variant={TextVariant.BodyXs}
      />,
    );

    expect(mockTwStyle).toHaveBeenCalledWith(
      'text-body-xs',
      'font-default-medium',
      'text-default',
    );
  });

  it('rolls each digit in a column as wide as that glyph', () => {
    mockTextStyle = { lineHeight: 56 };

    const { getAllByText, getByText, queryByText } = render(
      <AnimatedSlotText value="$18.51" />,
    );

    expect(getByText('$')).toBeOnTheScreen();
    expect(queryByText('18.51')).toBeNull();
    expect(getAllByText('1').length).toBeGreaterThan(1);
    expect(getAllByText('1')[0]).not.toHaveStyle({
      fontVariant: ['tabular-nums'],
    });
  });
});
