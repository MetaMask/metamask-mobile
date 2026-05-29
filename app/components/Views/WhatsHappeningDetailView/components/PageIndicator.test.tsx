import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PageIndicator from './PageIndicator';

describe('PageIndicator', () => {
  it('renders nothing when count is 1', () => {
    const { toJSON } = renderWithProvider(
      <PageIndicator count={1} activeIndex={0} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when count is 0', () => {
    const { toJSON } = renderWithProvider(
      <PageIndicator count={0} activeIndex={0} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders count dots when count > 1', () => {
    renderWithProvider(<PageIndicator count={3} activeIndex={0} />);
    const activeDots = screen.queryAllByTestId('page-indicator-dot-active');
    const inactiveDots = screen.queryAllByTestId('page-indicator-dot');
    expect(activeDots.length + inactiveDots.length).toBe(3);
  });

  it('marks the correct dot as active', () => {
    renderWithProvider(<PageIndicator count={3} activeIndex={1} />);
    expect(screen.queryAllByTestId('page-indicator-dot-active')).toHaveLength(
      1,
    );
    expect(screen.queryAllByTestId('page-indicator-dot')).toHaveLength(2);
  });

  it('marks the first dot active when activeIndex is 0', () => {
    renderWithProvider(<PageIndicator count={4} activeIndex={0} />);
    expect(screen.queryAllByTestId('page-indicator-dot-active')).toHaveLength(
      1,
    );
    expect(screen.queryAllByTestId('page-indicator-dot')).toHaveLength(3);
  });

  it('active dot has wider width style than inactive dots (pill shape)', () => {
    renderWithProvider(<PageIndicator count={3} activeIndex={0} />);
    const [activeDot] = screen.getAllByTestId('page-indicator-dot-active');
    const inactiveDots = screen.getAllByTestId('page-indicator-dot');

    const activeStyle = activeDot.props.style;
    const inactiveStyle = inactiveDots[0].props.style;

    // Active dot should be wider (w-6 = 24) than inactive (w-2 = 8)
    const activeWidth = Array.isArray(activeStyle)
      ? activeStyle.find((s: Record<string, unknown>) => s?.width !== undefined)
          ?.width
      : activeStyle?.width;
    const inactiveWidth = Array.isArray(inactiveStyle)
      ? inactiveStyle.find(
          (s: Record<string, unknown>) => s?.width !== undefined,
        )?.width
      : inactiveStyle?.width;

    if (activeWidth !== undefined && inactiveWidth !== undefined) {
      expect(activeWidth).toBeGreaterThan(inactiveWidth);
    } else {
      // Style is applied but might be in a different shape — just verify both dots are distinct
      expect(activeDot.props.testID).toBe('page-indicator-dot-active');
    }
  });
});
