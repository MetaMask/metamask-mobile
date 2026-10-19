import { render } from '@testing-library/react-native';
import React from 'react';
import { Rect } from 'react-native-svg';
import PerpsProOrderBookGlyph from './PerpsProOrderBookGlyph';

const barXPositions = (glyph: ReturnType<typeof render>) =>
  glyph.UNSAFE_getAllByType(Rect).map((rect) => rect.props.x);

const barWidths = (glyph: ReturnType<typeof render>) =>
  glyph.UNSAFE_getAllByType(Rect).map((rect) => rect.props.width);

describe('PerpsProOrderBookGlyph', () => {
  it('grows bars from the left edge when pinned left', () => {
    const glyph = render(<PerpsProOrderBookGlyph align="left" />);

    expect(barXPositions(glyph)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('grows bars from the right edge when pinned right', () => {
    const glyph = render(<PerpsProOrderBookGlyph align="right" />);

    // Each bar is inset by its own width so the right edges line up.
    const widths = barWidths(glyph);
    expect(barXPositions(glyph)).toEqual(widths.map((width) => 28 - width));
  });

  it('mirrors the same bar widths regardless of side', () => {
    const left = render(<PerpsProOrderBookGlyph align="left" />);
    const right = render(<PerpsProOrderBookGlyph align="right" />);

    expect(barWidths(left)).toEqual(barWidths(right));
    expect(barWidths(left)).toEqual([28, 18, 12, 12, 18, 28]);
  });
});
