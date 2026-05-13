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
});
