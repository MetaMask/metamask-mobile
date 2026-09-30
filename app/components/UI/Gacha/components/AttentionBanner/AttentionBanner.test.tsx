import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaAttentionBannerTestIds } from '../../Gacha.testIds';
import { createOperation } from '../../views/testUtils';
import AttentionBanner, { getAttentionKind } from './AttentionBanner';

describe('getAttentionKind', () => {
  it('returns unrevealed for an opened operation', () => {
    expect(getAttentionKind(createOperation({ status: 'opened' }))).toBe(
      'unrevealed',
    );
  });

  it('returns processing for a resumable operation without error', () => {
    expect(getAttentionKind(createOperation({ status: 'submitted' }))).toBe(
      'processing',
    );
  });

  it('returns attention for a resumable operation with an error', () => {
    expect(
      getAttentionKind(
        createOperation({
          status: 'signed',
          error: { code: 'SUBMIT_FAILED' },
        }),
      ),
    ).toBe('attention');
  });

  it('returns attention for expired and failed operations', () => {
    expect(getAttentionKind(createOperation({ status: 'expired' }))).toBe(
      'attention',
    );
    expect(getAttentionKind(createOperation({ status: 'failed' }))).toBe(
      'attention',
    );
  });
});

describe('AttentionBanner', () => {
  it('shows the card-to-reveal banner and opens the operation on View', () => {
    const onView = jest.fn();
    renderWithProvider(
      <AttentionBanner
        operation={createOperation({ memo: 'memo-9', status: 'opened' })}
        onView={onView}
      />,
    );

    fireEvent.press(screen.getByText('View'));

    expect(
      screen.getByTestId(GachaAttentionBannerTestIds.BANNER),
    ).toBeOnTheScreen();
    expect(screen.getByText('You have a card to reveal')).toBeOnTheScreen();
    expect(onView).toHaveBeenCalledWith('memo-9');
  });

  it('shows the processing banner', () => {
    renderWithProvider(
      <AttentionBanner
        operation={createOperation({ status: 'paid' })}
        onView={jest.fn()}
      />,
    );

    expect(screen.getByText('A pack is being opened')).toBeOnTheScreen();
  });
});
