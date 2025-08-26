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

  it('render matches snapshot', () => {
    const { toJSON } = render(<DepositDateField {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with a value', () => {
    const value = new Date(2024, 0, 2).getTime().toString();
    const { toJSON } = render(
      <DepositDateField {...defaultProps} value={value} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with an error', () => {
    const { toJSON } = render(
      <DepositDateField {...defaultProps} error="Invalid date format" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with empty value', () => {
    const { toJSON } = render(<DepositDateField {...defaultProps} value="" />);
    expect(toJSON()).toMatchSnapshot();
  });

  describe('Platform specific rendering', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('date picker matches snapshot on Android', () => {
      Platform.OS = 'android';
      const { toJSON, getByTestId } = render(
        <DepositDateField {...defaultProps} />,
      );
      fireEvent.press(getByTestId('textfield'));

      expect(toJSON()).toMatchSnapshot();
    });

    it('date picker matches snapshot on iOS', () => {
      Platform.OS = 'ios';
      const { toJSON, getByTestId } = render(
        <DepositDateField {...defaultProps} />,
      );
      fireEvent.press(getByTestId('textfield'));

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
