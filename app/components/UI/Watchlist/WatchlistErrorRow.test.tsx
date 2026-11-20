import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import WatchlistErrorRow from './WatchlistErrorRow';

describe('WatchlistErrorRow', () => {
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('announces the async error and hides unavailable retry action', async () => {
    render(<WatchlistErrorRow />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to load watchlist items',
    );
    expect(screen.queryByText('Try again')).not.toBeOnTheScreen();
    await waitFor(() =>
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Unable to load watchlist items',
      ),
    );
  });

  it('renders retry when refresh is available', () => {
    render(<WatchlistErrorRow onRetry={jest.fn()} />);

    expect(screen.getByText('Try again')).toBeOnTheScreen();
  });
});
