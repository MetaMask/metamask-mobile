import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { QuoteResponse } from '@metamask/bridge-controller';
import RebateBanner, { REBATE_BANNER_TEST_ID } from '.';

const mockUseSwapsRebate = jest.fn();
jest.mock('../../hooks/useSwapsRebate', () => ({
  useSwapsRebate: (...args: unknown[]) => mockUseSwapsRebate(...args),
}));

const mockOpenTooltipModal = jest.fn();
jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: mockOpenTooltipModal }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const quote = { feeData: {} } as unknown as QuoteResponse['quote'];

describe('RebateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the rebate percentage when a rebate is available', () => {
    mockUseSwapsRebate.mockReturnValue(5);

    render(<RebateBanner quote={quote} />);

    expect(mockUseSwapsRebate).toHaveBeenCalledWith(quote);
    expect(screen.getByTestId(REBATE_BANNER_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.getByText('bridge.rebate_banner:{"percent":5}'),
    ).toBeOnTheScreen();
  });

  it('renders nothing when no rebate is available', () => {
    mockUseSwapsRebate.mockReturnValue(null);

    render(<RebateBanner quote={quote} />);

    expect(screen.queryByTestId(REBATE_BANNER_TEST_ID)).not.toBeOnTheScreen();
  });

  it('opens the rebate tooltip when the info icon is pressed', () => {
    mockUseSwapsRebate.mockReturnValue(5);

    render(<RebateBanner quote={quote} />);
    fireEvent.press(screen.getByLabelText('bridge.rebate_tooltip_title'));

    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      'bridge.rebate_tooltip_title',
      'bridge.rebate_tooltip_content:{"percent":5}',
    );
  });
});
