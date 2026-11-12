import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PackJustOpened } from './CollectiblesPackSections';

// Narrow native list callback contract; the hook owns timer/queue coverage.
describe('PackJustOpened scroll callbacks', () => {
  it('pauses on drag and resumes only after returning to the start', async () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    renderWithProvider(
      <PackJustOpened
        cards={[]}
        emptyContent={null}
        onSelect={jest.fn()}
        onPause={onPause}
        onResume={onResume}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const row = screen.getByTestId('collectibles-pack-openings-list');

    fireEvent(row, 'scrollBeginDrag');
    fireEvent(row, 'scrollEndDrag', {
      nativeEvent: { contentOffset: { x: 80 } },
    });
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
    fireEvent(row, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });

    expect(onResume).toHaveBeenCalledTimes(1);
  });
});
