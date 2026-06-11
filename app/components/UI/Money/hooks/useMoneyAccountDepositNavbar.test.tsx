import { renderHook } from '@testing-library/react-hooks';
import { useMoneyAccountDepositNavbar } from './useMoneyAccountDepositNavbar';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/confirmations/hooks/ui/useNavbar');

const mockUseNavbar = useNavbar as jest.MockedFunction<typeof useNavbar>;

describe('useMoneyAccountDepositNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useNavbar with the "Add money" title and addBackButton', () => {
    renderHook(() => useMoneyAccountDepositNavbar());

    expect(mockUseNavbar).toHaveBeenCalledWith(
      'confirm.title.money_account_add_money',
      true,
    );
  });

  it('does not pass navbar overrides', () => {
    renderHook(() => useMoneyAccountDepositNavbar());

    expect(mockUseNavbar.mock.calls[0]).toHaveLength(2);
  });
});
