import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ClipboardManager from '../../../../../../core/ClipboardManager';
import CopyButton from './CopyButton';

jest.mock('../../../../../../core/ClipboardManager');

describe('CopyButton', () => {
  it('should match snapshot', async () => {
    const container = render(<CopyButton copyText={'DUMMY'} />);
    expect(container).toMatchSnapshot();
  });

  it('should copy text to clipboard when pressed', async () => {
    const { getByTestId } = render(<CopyButton copyText={'DUMMY'} />);
    fireEvent.press(getByTestId('copyButtonTestId'));
    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
  });
});
