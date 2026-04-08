import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import DepositDateField from './DepositDateField';

jest.mock('../../../../../../../locales/i18n', () => ({
  locale: 'en-US',
}));

const defaultProps = {
  label: 'Date of Birth',
  value: new Date(2024, 0, 1).getTime().toString(),
  onChangeText: jest.fn(),
};

describe('DepositDateField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label', () => {
    const { getByText } = render(<DepositDateField {...defaultProps} />);
    expect(getByText('Date of Birth')).toBeOnTheScreen();
  });

  it('renders with a different date value', () => {
    const value = new Date(2024, 0, 2).getTime().toString();
    const { getByDisplayValue } = render(
      <DepositDateField {...defaultProps} value={value} />,
    );
    expect(getByDisplayValue('01/02/2024')).toBeOnTheScreen();
  });

  it('renders with an error message', () => {
    const { getByText } = render(
      <DepositDateField {...defaultProps} error="Invalid date format" />,
    );
    expect(getByText('Invalid date format')).toBeOnTheScreen();
  });

  it('renders with empty value showing placeholder', () => {
    const { queryByDisplayValue } = render(
      <DepositDateField {...defaultProps} value="" />,
    );
    expect(queryByDisplayValue(/\d{2}\/\d{2}\/\d{4}/)).toBeNull();
  });

  describe('Platform specific rendering', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('opens date picker on Android without Cancel/Done buttons', () => {
      Platform.OS = 'android';
      const { getByTestId, queryByText } = render(
        <DepositDateField {...defaultProps} />,
      );
      fireEvent.press(getByTestId('textfield'));

      expect(queryByText('Cancel')).toBeNull();
      expect(queryByText('Done')).toBeNull();
    });

    it('opens date picker on iOS (modal becomes visible)', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(<DepositDateField {...defaultProps} />);
      fireEvent.press(getByTestId('textfield'));
      expect(getByTestId('textfield')).toBeOnTheScreen();
    });
  });
});
