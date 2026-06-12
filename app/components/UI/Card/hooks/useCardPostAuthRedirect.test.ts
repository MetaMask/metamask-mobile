import { renderHook } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import {
  MONEY_HOME_CARD_ORIGIN,
  useCardPostAuthRedirect,
} from './useCardPostAuthRedirect';

const mockGetParent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    getParent: mockGetParent,
  }),
}));

describe('useCardPostAuthRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParent.mockReturnValue(undefined);
  });

  it('returns undefined when no parent navigator exposes postAuthRedirect', () => {
    const { result } = renderHook(() => useCardPostAuthRedirect());
    expect(result.current).toBeUndefined();
  });

  it('returns postAuthRedirect from a parent route params', () => {
    mockGetParent.mockReturnValue({
      getState: () => ({
        routes: [
          {
            params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
          },
        ],
      }),
      getParent: () => undefined,
    });

    const { result } = renderHook(() => useCardPostAuthRedirect());
    expect(result.current).toEqual({
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('returns postAuthRedirect from nested onboarding params', () => {
    mockGetParent.mockReturnValue({
      getState: () => ({
        routes: [
          {
            params: {
              screen: Routes.CARD.ONBOARDING.ROOT,
              params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
            },
          },
        ],
      }),
      getParent: () => undefined,
    });

    const { result } = renderHook(() => useCardPostAuthRedirect());
    expect(result.current).toEqual(MONEY_HOME_CARD_ORIGIN);
  });
});
