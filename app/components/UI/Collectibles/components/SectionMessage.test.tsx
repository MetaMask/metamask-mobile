import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { SectionMessage } from '#app/components/UI/Collectibles/components/SectionMessage';

const retryLabel = strings('collectibles.pack_detail.retry');

describe('SectionMessage', () => {
  it('shows the message', () => {
    render(<SectionMessage message="Lorem ipsum" />);

    expect(screen.getByText('Lorem ipsum')).toBeOnTheScreen();
  });

  it('hides the retry button without onRetry', () => {
    render(<SectionMessage message="Lorem ipsum" />);

    expect(screen.queryByText(retryLabel)).not.toBeOnTheScreen();
  });

  it('calls onRetry when retry is pressed', () => {
    const onRetry = jest.fn();
    render(<SectionMessage message="Lorem ipsum" onRetry={onRetry} />);

    fireEvent.press(screen.getByText(retryLabel));

    expect(onRetry).toHaveBeenCalled();
  });
});
