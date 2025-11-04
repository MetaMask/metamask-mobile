import React from 'react';
import { render } from '@testing-library/react-native';
import TPSLCountWarningTooltipContent from './TPSLCountWarningTooltipContent';

// Mock the strings function
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const mockStrings: Record<string, string> = {
      'perps.tooltips.tpsl_count_warning.content':
        'TP/SL count warning content',
    };
    return mockStrings[key] || key;
  }),
}));

describe('TPSLCountWarningTooltipContent', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <TPSLCountWarningTooltipContent testID="test-tooltip" />,
    );

    expect(getByTestId('test-tooltip')).toBeTruthy();
  });

  it('displays the warning content text', () => {
    const { getByText } = render(
      <TPSLCountWarningTooltipContent testID="test-tooltip" />,
    );

    expect(getByText('TP/SL count warning content')).toBeTruthy();
  });

  it('accepts data prop without crashing', () => {
    const mockData = {
      metamaskFeeRate: 0.1,
      protocolFeeRate: 0.05,
    };

    const { getByTestId } = render(
      <TPSLCountWarningTooltipContent testID="test-tooltip" data={mockData} />,
    );

    expect(getByTestId('test-tooltip')).toBeTruthy();
  });
});
