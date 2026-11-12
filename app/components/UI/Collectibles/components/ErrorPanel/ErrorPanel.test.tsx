import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CollectiblesErrorPanelTestIds } from '../../Collectibles.testIds';
import ErrorPanel from './ErrorPanel';

describe('ErrorPanel', () => {
  it('renders the title, the description and a retry action', () => {
    const onRetry = jest.fn();
    renderWithProvider(
      <ErrorPanel title="Failed" description="Details" onRetry={onRetry} />,
    );

    fireEvent.press(screen.getByTestId(CollectiblesErrorPanelTestIds.RETRY));

    expect(screen.getByText('Failed')).toBeOnTheScreen();
    expect(screen.getByText('Details')).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry action without onRetry', () => {
    renderWithProvider(<ErrorPanel title="Failed" />);

    expect(
      screen.queryByTestId(CollectiblesErrorPanelTestIds.RETRY),
    ).not.toBeOnTheScreen();
  });
});
