import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
