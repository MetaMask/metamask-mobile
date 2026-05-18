import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import { useMoneyAccountDepositNavbar } from './useMoneyAccountDepositNavbar';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { strings } from '../../../../../locales/i18n';
import { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';
import { MUSD_CONVERSION_APY } from '../../Earn/constants/musd';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/confirmations/hooks/ui/useNavbar');

const mockUseNavbar = useNavbar as jest.MockedFunction<typeof useNavbar>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('useMoneyAccountDepositNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('opens the tooltip modal with title and interpolated description when info button is pressed', () => {
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

    fireEvent.press(getByTestId('button-icon'));

    // Title rendered.
    expect(getByText('money.deposit_tooltip_title')).toBeOnTheScreen();
    // Description rendered (mocked strings returns the key).
    expect(getByText('money.deposit_tooltip_description')).toBeOnTheScreen();

    // Verify the description was requested with the APY percentage interpolated.
    expect(mockStrings).toHaveBeenCalledWith(
      'money.deposit_tooltip_description',
      {
        percentage: MUSD_CONVERSION_APY,
      },
    );
    expect(mockStrings).toHaveBeenCalledWith('money.deposit_tooltip_title');
  });

  it('closes the tooltip modal when the close button is pressed', () => {
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

    const { getByTestId, queryByText } = render(<Harness />);

    fireEvent.press(getByTestId('button-icon'));
    expect(queryByText('money.deposit_tooltip_title')).not.toBeNull();

    fireEvent.press(
      getByTestId('money-account-deposit-navbar-tooltip-close-btn'),
    );

    expect(queryByText('money.deposit_tooltip_title')).toBeNull();
  });
});
