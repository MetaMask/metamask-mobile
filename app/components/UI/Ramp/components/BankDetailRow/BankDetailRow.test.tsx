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

  it('renders label and value', () => {
    const { getByText } = render(<BankDetailRow {...defaultProps} />);
    expect(getByText('Account Number')).toBeOnTheScreen();
    expect(getByText('1234567890')).toBeOnTheScreen();
  });

  it('renders with different label and value', () => {
    const { getByText } = render(
      <BankDetailRow label="Bank Name" value="Chase Bank" />,
    );
    expect(getByText('Bank Name')).toBeOnTheScreen();
    expect(getByText('Chase Bank')).toBeOnTheScreen();
  });

  it('copies value to clipboard when copy button is pressed', () => {
    const { getByTestId } = render(<BankDetailRow {...defaultProps} />);
    const copyButton = getByTestId('copy-button');

    fireEvent.press(copyButton);

    expect(Clipboard.setString).toHaveBeenCalledWith(defaultProps.value);
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });
});
