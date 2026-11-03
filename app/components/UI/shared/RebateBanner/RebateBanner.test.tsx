import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import RebateBanner, { REBATE_BANNER_TEST_ID } from './RebateBanner';

const mockOpenTooltipModal = jest.fn();
jest.mock('../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: mockOpenTooltipModal }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

describe('RebateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders generic rebate copy', () => {
    render(<RebateBanner rebatePercent={5} />);

    expect(screen.getByTestId(REBATE_BANNER_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.getByText('rewards.rebate.banner:{"percent":5}'),
    ).toBeOnTheScreen();
  });

  it('supports product-specific test IDs', () => {
    render(
      <RebateBanner
        rebatePercent={5}
        testID="perps-rebate-banner"
        twClassName="mb-3"
      />,
    );

    expect(screen.getByTestId('perps-rebate-banner')).toBeOnTheScreen();
  });

  it('opens the final shared rebate tooltip', () => {
    render(<RebateBanner rebatePercent={5} />);

    fireEvent.press(screen.getByLabelText('rewards.rebate.tooltip_title'));

    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      'rewards.rebate.tooltip_title',
      'rewards.rebate.tooltip_content:{"percent":5}',
    );
  });
});
