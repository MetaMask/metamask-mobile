import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictRegTimeTag, {
  PREDICT_REG_TIME_TAG_TEST_IDS,
} from './PredictRegTimeTag';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.reg_time_info.tag': 'Reg time',
      'predict.reg_time_info.accessibility_label':
        'Regulation time market information',
    };

    return translations[key] ?? key;
  }),
}));

describe('PredictRegTimeTag', () => {
  it('renders the Reg time label with default test IDs', () => {
    render(<PredictRegTimeTag />);

    expect(
      screen.getByTestId(PREDICT_REG_TIME_TAG_TEST_IDS.TAG),
    ).toHaveTextContent('Reg time');
    expect(
      screen.getByTestId(PREDICT_REG_TIME_TAG_TEST_IDS.INFO_BUTTON),
    ).toBeOnTheScreen();
  });

  it('exposes the regulation-time accessibility label on the pressable', () => {
    render(<PredictRegTimeTag />);

    expect(
      screen.getByTestId(PREDICT_REG_TIME_TAG_TEST_IDS.INFO_BUTTON),
    ).toHaveProp('accessibilityLabel', 'Regulation time market information');
    expect(
      screen.getByTestId(PREDICT_REG_TIME_TAG_TEST_IDS.INFO_BUTTON),
    ).toHaveProp('accessibilityRole', 'button');
  });

  it('calls onPress when the info button is pressed', () => {
    const onPress = jest.fn();

    render(<PredictRegTimeTag onPress={onPress} />);

    fireEvent.press(
      screen.getByTestId(PREDICT_REG_TIME_TAG_TEST_IDS.INFO_BUTTON),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('supports custom test IDs', () => {
    render(
      <PredictRegTimeTag
        testID="custom-reg-time-tag"
        buttonTestID="custom-reg-time-button"
      />,
    );

    expect(screen.getByTestId('custom-reg-time-tag')).toHaveTextContent(
      'Reg time',
    );
    expect(screen.getByTestId('custom-reg-time-button')).toBeOnTheScreen();
  });
});
