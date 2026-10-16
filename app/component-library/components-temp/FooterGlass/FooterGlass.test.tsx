import React from 'react';
import { Text, processColor } from 'react-native';
import { render } from '@testing-library/react-native';
import FooterGlass from './FooterGlass';
import { mockTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

const mockInsets = { top: 0, right: 0, bottom: 34, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => mockInsets,
}));

describe('FooterGlass', () => {
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
