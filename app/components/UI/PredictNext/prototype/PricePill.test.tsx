import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { PricePill, leadingIndex } from './components';

const paint = (isLeading: boolean) => {
  const view = render(
    <PricePill
      price={isLeading ? 56 : 44}
      isLeading={isLeading}
      onPress={() => undefined}
    />,
  );
  expect(view.getByLabelText(isLeading ? '56%' : '44%')).toBeOnTheScreen();
  const button = view.getByRole('button');
  const outline = StyleSheet.flatten(button.props.style).borderColor;
  view.unmount();
  return outline;
};

describe('leadingIndex', () => {
  it('returns the only outcome ahead on price', () => {
    expect(leadingIndex([{ price: 44 }, { price: 56 }])).toBe(1);
  });

  it('returns -1 when the top prices tie', () => {
    expect(leadingIndex([{ price: 50 }, { price: 50 }])).toBe(-1);
  });
});

describe('PricePill', () => {
  it('outlines only the favorite price in success', () => {
    const leading = paint(true);
    const trailing = paint(false);

    expect(leading).toBeDefined();
    expect(leading).not.toBe(trailing);
  });
});
