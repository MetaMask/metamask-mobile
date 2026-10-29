import React from 'react';
import { screen } from '@testing-library/react-native';
import LinearGradient from 'react-native-linear-gradient';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../util/theme';
import TrendingFilterRail from './TrendingFilterRail';

describe('TrendingFilterRail', () => {
  it('washes chips with the page color so light mode fades to white', () => {
    renderWithProvider(
      <TrendingFilterRail testID="trending-filters">{null}</TrendingFilterRail>,
    );

    const gradient = screen.UNSAFE_getByType(LinearGradient);
    const pageColor = mockTheme.colors.background.default;

    expect(gradient.props.colors).toEqual([
      `${pageColor}00`,
      pageColor,
      pageColor,
    ]);
    expect(gradient.props.colors[0]).not.toBe('transparent');
    expect(gradient.props.locations).toEqual([0, 0.5, 1]);
  });

  it('sits the filter icon on an opaque page-color disc so chips cannot show through', () => {
    renderWithProvider(
      <TrendingFilterRail testID="trending-filters">{null}</TrendingFilterRail>,
    );

    expect(screen.getByTestId('trending-filters-disc')).toHaveStyle({
      backgroundColor: mockTheme.colors.background.default,
    });
  });
});
