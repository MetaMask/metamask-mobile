import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { rejectPendingTransactions } from './rejectPendingTransactions';
import { completePrototypeMoneySend } from './completePrototypeMoneySend';

jest.mock('./rejectPendingTransactions', () => ({
  rejectPendingTransactions: jest.fn(),
}));

describe('completePrototypeMoneySend', () => {
  it('clears the pending transaction and returns to Money home', () => {
    const navigation = {
      reset: jest.fn(),
    } as unknown as AppNavigationProp;
    const showSuccessToast = jest.fn();

    completePrototypeMoneySend(navigation, showSuccessToast);

    expect(rejectPendingTransactions).toHaveBeenCalledTimes(1);
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [
        {
          name: Routes.HOME_TABS,
          params: {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        },
      ],
    });
    expect(showSuccessToast).toHaveBeenCalledWith('Transfer complete');
  });
});
