import Routes from '../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity type-filter; route-isolation backlog
import {
  ActivityTypeFilter,
  PerpsActivityFilter,
} from '../../components/Views/ActivityScreen/types';
import { navigateToTransactionDetails } from './navigateToTransactionDetails';

const createNavigation = () => ({ navigate: jest.fn() });

describe('navigateToTransactionDetails', () => {
  it('opens the activity list then the transaction details, both synchronously', () => {
    const navigation = createNavigation();

    navigateToTransactionDetails(navigation, { transactionId: '0xabc' });

    expect(navigation.navigate).toHaveBeenNthCalledWith(
      1,
      Routes.TRANSACTIONS_VIEW,
    );
    expect(navigation.navigate).toHaveBeenNthCalledWith(
      2,
      Routes.TRANSACTION_DETAILS,
      { transactionId: '0xabc' },
    );
    // No setTimeout: both navigations fire in the same tick.
    expect(navigation.navigate).toHaveBeenCalledTimes(2);
  });

  it('pre-selects the activity list filter when initialTypeFilter is given', () => {
    const navigation = createNavigation();

    navigateToTransactionDetails(navigation, {
      transactionId: '0xabc',
      initialTypeFilter: ActivityTypeFilter.Predictions,
    });

    expect(navigation.navigate).toHaveBeenNthCalledWith(
      1,
      Routes.TRANSACTIONS_VIEW,
      {
        screen: Routes.TRANSACTIONS_VIEW,
        params: { initialTypeFilter: ActivityTypeFilter.Predictions },
      },
    );
  });

  it('includes the perps sub-filter when initialPerpsFilter is given', () => {
    const navigation = createNavigation();

    navigateToTransactionDetails(navigation, {
      transactionId: '0xabc',
      initialTypeFilter: ActivityTypeFilter.Perps,
      initialPerpsFilter: PerpsActivityFilter.Deposits,
    });

    expect(navigation.navigate).toHaveBeenNthCalledWith(
      1,
      Routes.TRANSACTIONS_VIEW,
      {
        screen: Routes.TRANSACTIONS_VIEW,
        params: {
          initialTypeFilter: ActivityTypeFilter.Perps,
          initialPerpsFilter: PerpsActivityFilter.Deposits,
        },
      },
    );
  });

  it('opens only the activity list when no transactionId is given', () => {
    const navigation = createNavigation();

    navigateToTransactionDetails(navigation, {});

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('defaults options to an empty object', () => {
    const navigation = createNavigation();

    navigateToTransactionDetails(navigation);

    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });
});
