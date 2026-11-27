import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { Theme, ThemeProvider } from '@metamask/design-system-twrnc-preset';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import {
  HomeCategoriesSection,
  type HomeCategoryChip,
} from './HomeCategoriesSection';
import { PredictHomeTestIds } from '../PredictHome.testIds';

// Every Category in the design, as if each had a Feed on the Active Venue.
const ALL_CATEGORIES: HomeCategoryChip[] = [
  { id: 'politics', label: 'Politics', iconName: IconName.Global },
  { id: 'sports', label: 'Sports', iconName: IconName.Trophy },
  { id: 'crypto', label: 'Crypto', iconName: IconName.MoneyBag },
  { id: 'esports', label: 'E-sports', iconName: IconName.GameController },
  { id: 'weather', label: 'Weather' },
  { id: 'finance', label: 'Finance', iconName: IconName.Bank },
  { id: 'tech', label: 'Tech', iconName: IconName.Data },
];

const renderSection = (
  props: Partial<React.ComponentProps<typeof HomeCategoriesSection>> = {},
) =>
  render(
    <HomeCategoriesSection
      categories={ALL_CATEGORIES}
      onSelect={jest.fn()}
      {...props}
    />,
  );

describe('HomeCategoriesSection', () => {
  it('renders every chip in order on a wrapping row with no header', () => {
    renderSection();

    expect(
      within(screen.getByTestId(PredictHomeTestIds.CATEGORIES)).queryByRole(
        'header',
      ),
    ).not.toBeOnTheScreen();
    const list = screen.getByTestId(PredictHomeTestIds.CATEGORIES_LIST);
    expect(StyleSheet.flatten(list.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    });
    const chips = within(list).getAllByRole('button');
    expect(chips.map((chip) => chip.props.testID)).toEqual(
      ALL_CATEGORIES.map(({ id }) => PredictHomeTestIds.categoryChip(id)),
    );
    chips.forEach((chip, index) =>
      expect(chip).toHaveTextContent(ALL_CATEGORIES[index].label),
    );
  });

  it('draws each pill chip 40pt min-height on elevated1 with muted border and 12pt horizontal padding', () => {
    renderSection();

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
    ).toHaveStyle({
      minHeight: 40,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: lightTheme.colors.border.muted,
      backgroundColor: lightTheme.colors.background.elevated1,
      paddingLeft: 12,
      paddingRight: 12,
      gap: 6,
    });
  });

  it('draws dark theme elevated1 surface and muted border in dark mode', () => {
    render(
      <ThemeProvider theme={Theme.Dark}>
        <HomeCategoriesSection
          categories={ALL_CATEGORIES}
          onSelect={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
    ).toHaveStyle({
      backgroundColor: darkTheme.colors.background.elevated1,
      borderColor: darkTheme.colors.border.muted,
    });
  });

  it('renders a 16pt default-colored icon and BodySm Regular label on each chip', () => {
    renderSection();

    const politicsIcon = screen.getByTestId(
      PredictHomeTestIds.categoryChipIcon('politics'),
    );
    expect(politicsIcon).toHaveProp('name', IconName.Global);
    expect(StyleSheet.flatten(politicsIcon.props.style)).toMatchObject({
      width: 16,
      height: 16,
      color: lightTheme.colors.icon.default,
    });
    const weatherIcon = screen.getByTestId(
      PredictHomeTestIds.categoryChipIcon('weather'),
    );
    expect(weatherIcon).toHaveProp('name', IconName.Explore);
    expect(
      within(
        screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
      ).getByText('Politics'),
    ).toHaveStyle({
      fontSize: 14,
      lineHeight: 22,
      color: lightTheme.colors.text.default,
    });
  });

  it('applies the muted pressed fill while pressed', () => {
    renderSection();
    const chip = screen.getByTestId(PredictHomeTestIds.categoryChip('sports'));

    fireEvent(chip, 'responderGrant', {
      persist: jest.fn(),
      nativeEvent: {
        locationX: 0,
        locationY: 0,
        pageX: 0,
        pageY: 0,
        timestamp: 0,
        touches: [],
        changedTouches: [],
      },
    });

    expect(chip).toHaveStyle({
      backgroundColor: lightTheme.colors.background.mutedPressed,
    });
  });

  it('reports the pressed Category', () => {
    const onSelect = jest.fn();
    renderSection({ onSelect });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.categoryChip('crypto')),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('crypto');
  });

  it('renders nothing without a Category to show', () => {
    renderSection({ categories: [] });

    expect(
      screen.queryByTestId(PredictHomeTestIds.CATEGORIES),
    ).not.toBeOnTheScreen();
  });
});
