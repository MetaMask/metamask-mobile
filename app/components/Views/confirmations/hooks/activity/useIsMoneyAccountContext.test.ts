import { renderHook } from '@testing-library/react-hooks';
import { useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useIsMoneyAccountContext } from './useIsMoneyAccountContext';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

describe('useIsMoneyAccountContext', () => {
  const useRouteMock = jest.mocked(useRoute);

  it('returns true when route is MONEY.TRANSACTION_DETAILS', () => {
    useRouteMock.mockReturnValue({
      name: Routes.MONEY.TRANSACTION_DETAILS,
      key: 'test',
      params: undefined,
    });

    const { result } = renderHook(() => useIsMoneyAccountContext());

    expect(result.current).toBe(true);
  });

  it('returns true when route is MONEY.CARD_TRANSACTION_DETAILS', () => {
    useRouteMock.mockReturnValue({
      name: Routes.MONEY.CARD_TRANSACTION_DETAILS,
      key: 'test',
      params: undefined,
    });

    const { result } = renderHook(() => useIsMoneyAccountContext());

    expect(result.current).toBe(true);
  });

  it('returns false for other routes', () => {
    useRouteMock.mockReturnValue({
      name: 'SomeOtherRoute',
      key: 'test',
      params: undefined,
    });

    const { result } = renderHook(() => useIsMoneyAccountContext());

    expect(result.current).toBe(false);
  });
});
