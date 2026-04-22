import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import BankDetailRow from './BankDetailRow';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

const defaultProps = {
  label: 'Account Number',
  value: '1234567890',
};

describe('BankDetailRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(<BankDetailRow {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with different values', () => {
    const { toJSON } = render(
      <BankDetailRow label="Bank Name" value="Chase Bank" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('copies value to clipboard when copy button is pressed', () => {
    const { getByTestId } = render(<BankDetailRow {...defaultProps} />);
    const copyButton = getByTestId('copy-button');

    fireEvent.press(copyButton);

    expect(Clipboard.setString).toHaveBeenCalledWith(defaultProps.value);
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });
});
