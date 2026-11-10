import React from 'react';
import { StyleSheet } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';
import { render, screen } from '@testing-library/react-native';
import CarouselPaginationDots from './CarouselPaginationDots';

const TEST_ID = 'carousel-pagination-dots';

// The row is hidden from screen readers, so queries must include hidden elements.
const HIDDEN = { includeHiddenElements: true };
const byTestId = (testID: string) => screen.getByTestId(testID, HIDDEN);

describe('CarouselPaginationDots', () => {
  it('renders one indicator per page', () => {
    render(<CarouselPaginationDots totalPages={5} activePage={0} />);

    expect(byTestId(TEST_ID).children).toHaveLength(5);
  });

  it.each([0, 2, 4])('puts the active bar at page %i', (activePage) => {
    render(<CarouselPaginationDots totalPages={5} activePage={activePage} />);

    const order = byTestId(TEST_ID).children.map((child) =>
      typeof child === 'string' ? child : child.props.testID,
    );
    expect(order.indexOf(`${TEST_ID}-active`)).toBe(activePage);
    expect(
      screen.getAllByTestId(new RegExp(`^${TEST_ID}-dot-`), HIDDEN),
    ).toHaveLength(4);
  });

  it('draws the active page as a 24x4 bar and the others as 4x4 dots', () => {
    render(<CarouselPaginationDots totalPages={3} activePage={1} />);

    expect(
      StyleSheet.flatten(byTestId(`${TEST_ID}-active`).props.style),
    ).toMatchObject({ width: 24, height: 4, borderRadius: 9999 });
    expect(
      StyleSheet.flatten(byTestId(`${TEST_ID}-dot-0`).props.style),
    ).toMatchObject({ width: 4, height: 4, borderRadius: 9999 });
    expect(
      StyleSheet.flatten(byTestId(`${TEST_ID}-dot-2`).props.style),
    ).toMatchObject({ width: 4, height: 4 });
  });

  it('colours the active bar and the dots from theme tokens', () => {
    render(<CarouselPaginationDots totalPages={2} activePage={0} />);

    const active = StyleSheet.flatten(
      byTestId(`${TEST_ID}-active`).props.style,
    );
    const inactive = StyleSheet.flatten(
      byTestId(`${TEST_ID}-dot-1`).props.style,
    );
    expect(active.backgroundColor).toBe(lightTheme.colors.icon.alternative);
    expect(inactive.backgroundColor).toBe(lightTheme.colors.icon.muted);
  });

  it('fits a 20pt-tall row: 4pt indicators with 8pt above and below', () => {
    render(<CarouselPaginationDots totalPages={5} activePage={0} />);

    expect(StyleSheet.flatten(byTestId(TEST_ID).props.style)).toMatchObject({
      paddingTop: 8,
      paddingBottom: 8,
      gap: 8,
    });
  });

  it('hides itself from screen readers and touches', () => {
    render(<CarouselPaginationDots totalPages={3} activePage={0} />);

    const row = byTestId(TEST_ID);
    expect(row.props).toMatchObject({
      pointerEvents: 'none',
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(row.props.accessibilityLabel).toBeUndefined();
    expect(screen.queryByTestId(TEST_ID)).not.toBeOnTheScreen();
  });

  it.each([1, 0])('renders nothing for %i page(s)', (totalPages) => {
    render(<CarouselPaginationDots totalPages={totalPages} activePage={0} />);

    expect(screen.queryByTestId(TEST_ID, HIDDEN)).not.toBeOnTheScreen();
  });

  it('uses a caller testID', () => {
    render(
      <CarouselPaginationDots totalPages={2} activePage={0} testID="home" />,
    );

    expect(byTestId('home')).toBeOnTheScreen();
    expect(byTestId('home-active')).toBeOnTheScreen();
  });
});
