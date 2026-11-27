import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConfirmationChime } from './kaching';

describe('ConfirmationChime', () => {
  it('starts the confirmation sound as soon as it mounts', () => {
    render(<ConfirmationChime />);

    expect(screen.getByTestId('confirmation-chime')).toBeOnTheScreen();
  });
});
