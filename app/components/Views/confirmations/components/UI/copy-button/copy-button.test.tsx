import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ClipboardManager from '../../../../../../core/ClipboardManager';
import CopyButton from './copy-button';

jest.mock('../../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

describe('CopyButton', () => {
  it('renders the copy button', () => {
    const { getByTestId } = render(<CopyButton copyText={'DUMMY'} />);
    expect(getByTestId('copyButtonTestId')).toBeOnTheScreen();
  });

  it('should copy text to clipboard when pressed', async () => {
    const { getByTestId } = render(<CopyButton copyText={'DUMMY'} />);
    fireEvent.press(getByTestId('copyButtonTestId'));
    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
    });
  });
});
