import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import { useMoneyAccountDepositNavbar } from './useMoneyAccountDepositNavbar';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import { strings } from '../../../../../locales/i18n';
import { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/confirmations/hooks/ui/useNavbar');
jest.mock('./useMoneyAccountBalance');

const mockUseNavbar = useNavbar as jest.MockedFunction<typeof useNavbar>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;

const APY_PERCENT = 4;

describe('useMoneyAccountDepositNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: APY_PERCENT,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls useNavbar with the "Add funds" title, addBackButton and headerRight override', () => {
    renderHook(() => useMoneyAccountDepositNavbar());

    expect(mockUseNavbar).toHaveBeenCalledTimes(1);
    expect(mockStrings).toHaveBeenCalledWith(
      'confirm.title.money_account_add_money',
    );
    expect(mockUseNavbar).toHaveBeenCalledWith(
      'confirm.title.money_account_add_money',
      true,
      expect.objectContaining({
        headerRight: expect.any(Function),
      }),
    );
  });

  it('returns a valid TooltipNode element', () => {
    const { result } = renderHook(() => useMoneyAccountDepositNavbar());

    expect(React.isValidElement(result.current.TooltipNode)).toBe(true);
  });

  it('provides headerRight override that renders the info button', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMoneyAccountDepositNavbar());

    expect(capturedOverrides?.headerRight).toBeDefined();

    const HeaderRight = capturedOverrides?.headerRight as React.FC;
    const { getByTestId } = render(<HeaderRight />);

    expect(getByTestId('button-icon')).toBeOnTheScreen();
  });

  it('opens with interpolated description then closes the tooltip modal', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    const Harness = () => {
      const { TooltipNode } = useMoneyAccountDepositNavbar();
      const HeaderRight = capturedOverrides?.headerRight as React.FC;
      return (
        <>
          <HeaderRight />
          {TooltipNode}
        </>
      );
    };

    const { getByTestId, getByText, queryByText } = render(<Harness />);

    // Modal is closed initially, content not present.
    expect(queryByText('money.deposit_tooltip_description')).toBeNull();

    // Open.
    fireEvent.press(getByTestId('button-icon'));

    expect(getByText('money.deposit_tooltip_title')).toBeOnTheScreen();
    expect(getByText('money.deposit_tooltip_description')).toBeOnTheScreen();

    expect(mockStrings).toHaveBeenCalledWith('money.deposit_tooltip_title', {
      percentage: APY_PERCENT,
    });
    expect(mockStrings).toHaveBeenCalledWith(
      'money.deposit_tooltip_description',
      { percentage: APY_PERCENT },
    );

    // Close.
    fireEvent.press(
      getByTestId('money-account-deposit-navbar-tooltip-close-btn'),
    );

    expect(queryByText('money.deposit_tooltip_title')).toBeNull();
  });
});
