import React from 'react';
import { render } from '@testing-library/react-native';
import Svg, { Path } from 'react-native-svg';
import { mockTheme } from '../../../../../util/theme';
import PerpsSwapIcon, { PERPS_SWAP_ICON_SIZE_SM } from './PerpsSwapIcon';

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return { ...actual, useTheme: () => actual.mockTheme };
});

describe('PerpsSwapIcon', () => {
  it('renders with the default testID and Sm size', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <PerpsSwapIcon direction="vertical" />,
    );

    expect(getByTestId('perps-swap-icon')).toBeOnTheScreen();
    const svg = UNSAFE_getByType(Svg);
    expect(svg.props.width).toBe(PERPS_SWAP_ICON_SIZE_SM);
    expect(svg.props.height).toBe(PERPS_SWAP_ICON_SIZE_SM);
    expect(UNSAFE_getByType(Path).props.fill).toBe(
      mockTheme.colors.icon.default,
    );
  });

  it('draws a different glyph per direction', () => {
    const vertical = render(<PerpsSwapIcon direction="vertical" />);
    const verticalPath = vertical.UNSAFE_getByType(Path).props.d;
    vertical.unmount();

    const horizontal = render(<PerpsSwapIcon direction="horizontal" />);

    expect(horizontal.UNSAFE_getByType(Path).props.d).not.toBe(verticalPath);
  });

  it('applies a custom size, colour and testID', () => {
    const color = mockTheme.colors.error.default;

    const { getByTestId, UNSAFE_getByType } = render(
      <PerpsSwapIcon
        direction="horizontal"
        size={20}
        color={color}
        testID="custom-swap-icon"
      />,
    );

    expect(getByTestId('custom-swap-icon')).toBeOnTheScreen();
    expect(UNSAFE_getByType(Svg).props.width).toBe(20);
    expect(UNSAFE_getByType(Path).props.fill).toBe(color);
  });
});
