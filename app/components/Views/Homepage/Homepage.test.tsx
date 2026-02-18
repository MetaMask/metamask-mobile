import React, { createRef } from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Homepage from './Homepage';
import { SectionRefreshHandle } from './types';

describe('Homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders placeholder content', () => {
    renderWithProvider(<Homepage />);

    expect(
      screen.getByText('Homepage sections coming soon...'),
    ).toBeOnTheScreen();
  });

  it('renders container element', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByTestId('homepage-container')).toBeOnTheScreen();
  });

  it('exposes refresh function via ref', () => {
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(<Homepage ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');
  });

  it('refresh function returns a resolved promise', async () => {
    const ref = createRef<SectionRefreshHandle>();
    renderWithProvider(<Homepage ref={ref} />);

    const result = ref.current?.refresh();

    await expect(result).resolves.toBeUndefined();
  });
});
