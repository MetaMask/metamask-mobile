import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FontWeight } from '@metamask/design-system-react-native';
import FilterChipSection from './FilterChipSection';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../../util/haptics', () => ({
  playSelection: jest.fn(() => Promise.resolve()),
}));

/**
 * Chip size is a prop on a presentational section. Component-view would have
 * to mount the whole social shell to read the same prop, so this stays a unit
 * test of the section contract.
 */
describe('FilterChipSection', () => {
  const options = [
    { id: 'all', labelKey: 'social_leaderboard.shell.filters.type.all' },
    {
      id: 'tokens',
      labelKey: 'social_leaderboard.shell.filters.type.tokens',
    },
  ] as const;

  it('renders secondary filter buttons at the 32px size', () => {
    render(
      <FilterChipSection
        titleKey="social_leaderboard.shell.filters.section.asset"
        options={options}
        value="all"
        onChange={jest.fn()}
        testID="social-filters-type"
      />,
    );

    expect(screen.getByTestId('social-filters-type-all')).toHaveStyle({
      height: 32,
    });
    expect(screen.getByTestId('social-filters-type-tokens')).toHaveStyle({
      height: 32,
    });
  });

  it('keeps 8px between the section label and the buttons', () => {
    render(
      <FilterChipSection
        titleKey="social_leaderboard.shell.filters.section.asset"
        options={options}
        value="all"
        onChange={jest.fn()}
        testID="social-filters-type"
      />,
    );

    expect(screen.getByTestId('social-filters-type-controls')).toHaveStyle({
      marginTop: 8,
    });
  });

  it('keeps border, padding, height, and label weight when a chip is selected', () => {
    const { rerender } = render(
      <FilterChipSection
        titleKey="social_leaderboard.shell.filters.section.asset"
        options={options}
        value="all"
        onChange={jest.fn()}
        testID="social-filters-type"
      />,
    );
    const unselected = StyleSheet.flatten(
      screen.getByTestId('social-filters-type-tokens').props.style,
    );

    rerender(
      <FilterChipSection
        titleKey="social_leaderboard.shell.filters.section.asset"
        options={options}
        value="tokens"
        onChange={jest.fn()}
        testID="social-filters-type"
      />,
    );
    const selected = StyleSheet.flatten(
      screen.getByTestId('social-filters-type-tokens').props.style,
    );
    const selectedLabel = screen.getByText(
      'social_leaderboard.shell.filters.type.tokens',
    );
    const unselectedLabel = screen.getByText(
      'social_leaderboard.shell.filters.type.all',
    );

    expect(selected).toEqual(
      expect.objectContaining({
        height: unselected.height,
        paddingLeft: unselected.paddingLeft,
        paddingRight: unselected.paddingRight,
        borderWidth: unselected.borderWidth,
      }),
    );
    expect(selected.borderWidth).toBe(1);
    expect(selectedLabel).toBeOnTheScreen();
    expect(unselectedLabel).toBeOnTheScreen();
    expect(
      screen.UNSAFE_getByProps({
        children: 'social_leaderboard.shell.filters.type.tokens',
        fontWeight: FontWeight.Medium,
      }),
    ).toBeTruthy();
    expect(
      screen.UNSAFE_getByProps({
        children: 'social_leaderboard.shell.filters.type.all',
        fontWeight: FontWeight.Medium,
      }),
    ).toBeTruthy();
  });

  it('reports the tapped option', () => {
    const onChange = jest.fn();

    render(
      <FilterChipSection
        titleKey="social_leaderboard.shell.filters.section.asset"
        options={options}
        value="all"
        onChange={onChange}
        testID="social-filters-type"
      />,
    );

    fireEvent.press(screen.getByTestId('social-filters-type-tokens'));

    expect(onChange).toHaveBeenCalledWith('tokens');
  });
});
