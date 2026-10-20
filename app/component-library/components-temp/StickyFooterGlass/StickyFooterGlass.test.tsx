import React from 'react';
import { Text, processColor } from 'react-native';
import { render } from '@testing-library/react-native';
import StickyFooterGlass from './StickyFooterGlass';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';
import { mockTheme } from '../../../util/theme';

const mockInsets = { top: 0, right: 0, bottom: 34, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => mockInsets,
}));

describe('StickyFooterGlass', () => {
  it('fades the content above into the screen colour', () => {
    const { getByTestId, getByText } = render(
      <StickyFooterGlass testID="footer">
        <Text>Buy</Text>
      </StickyFooterGlass>,
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
      <StickyFooterGlass testID="footer">
        <Text>Buy</Text>
      </StickyFooterGlass>,
    );

    expect(getByTestId('footer')).not.toHaveStyle({ paddingBottom: 34 });

    rerender(
      <StickyFooterGlass testID="footer" includesBottomInset>
        <Text>Buy</Text>
      </StickyFooterGlass>,
    );

    expect(getByTestId('footer')).toHaveStyle({ paddingBottom: 34 });
  });

  it('floats at the bottom with the fade behind it when overlaid', () => {
    const { getByTestId } = render(
      <StickyFooterGlass testID="footer" isOverlay>
        <Text>Buy</Text>
      </StickyFooterGlass>,
    );

    expect(getByTestId('footer')).toHaveStyle({
      position: 'absolute',
      bottom: 0,
    });
    expect(getByTestId('footer-fade')).toHaveStyle({ top: -32, bottom: 0 });
  });

  it('leaves the fade without a test ID when the footer has none', () => {
    const { queryByTestId } = render(
      <StickyFooterGlass>
        <Text>Buy</Text>
      </StickyFooterGlass>,
    );

    expect(queryByTestId('undefined-fade')).toBeNull();
  });
});
