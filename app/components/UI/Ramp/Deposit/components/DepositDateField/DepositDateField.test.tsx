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
    const component = render(<DepositDateField {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  it('render matches snapshot with a value', () => {
    const value = new Date(2024, 0, 2).getTime().toString();
    const component = render(
      <DepositDateField {...defaultProps} value={value} />,
    );
    expect(component).toMatchSnapshot();
  });

  it('render matches snapshot with an error', () => {
    const component = render(
      <DepositDateField {...defaultProps} error="Invalid date format" />,
    );
    expect(component).toMatchSnapshot();
  });

  it('render matches snapshot with empty value', () => {
    const component = render(<DepositDateField {...defaultProps} value="" />);
    expect(component).toMatchSnapshot();
  });

  describe('Platform specific rendering', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('date picker matches snapshot on Android', () => {
      Platform.OS = 'android';
      const component = render(
        <DepositDateField {...defaultProps} />,
      );
      const { getByTestId } = component;
      fireEvent.press(getByTestId('textfield'));

      expect(component).toMatchSnapshot();
    });

    it('date picker matches snapshot on iOS', () => {
      Platform.OS = 'ios';
      const component = render(
        <DepositDateField {...defaultProps} />,
      );
      const { getByTestId } = component;
      fireEvent.press(getByTestId('textfield'));

      expect(component).toMatchSnapshot();
    });
  });
});
