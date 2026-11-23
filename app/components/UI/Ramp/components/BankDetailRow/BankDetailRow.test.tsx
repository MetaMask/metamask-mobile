import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { strings } from '../../../../../../locales/i18n';
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

  it('names the copy control for screen readers', () => {
    const { getByTestId } = render(<BankDetailRow {...defaultProps} />);

    expect(getByTestId('copy-button').props).toEqual(
      expect.objectContaining({
        accessibilityRole: 'button',
        accessibilityLabel: strings('deposit.bank_details.copy_value', {
          label: defaultProps.label,
        }),
      }),
    );
  });

  it('copies value to clipboard when copy button is pressed', () => {
    const { getByTestId } = render(<BankDetailRow {...defaultProps} />);
    const copyButton = getByTestId('copy-button');

    fireEvent.press(copyButton);

    expect(Clipboard.setString).toHaveBeenCalledWith(defaultProps.value);
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });
});
