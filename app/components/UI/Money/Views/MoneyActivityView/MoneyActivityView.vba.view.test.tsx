import '../../../../../../tests/component-view/mocks';
import { waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaMoneyActivityHistory,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import {
  clearAccountsTransactionsApiMocks,
  setupV1AccountTransactionsApiMock,
} from '../../../../../../tests/component-view/api-mocking/accounts-transactions';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';

const enabledFlag = { enabled: true, minimumVersion: '0.0.0' };

const activityFlagOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          moneyVbaPendingActivityEnabled: enabledFlag,
          moneyVbaCompletedActivityEnabled: enabledFlag,
          moneyEnableActivityDetails: enabledFlag,
          moneyEnableCardActivityEnrichment: { ...enabledFlag, enabled: false },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const engineCall = Engine.controllerMessenger.call as jest.Mock;

const installVbaTransfers = (transfers: unknown[] | Error) => {
  const previous = engineCall.getMockImplementation();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountApiDataService:fetchVbaTransfers') {
      return transfers instanceof Error
        ? Promise.reject(transfers)
        : Promise.resolve({ transfers });
    }
    if (previous) {
      return previous(action, ...args);
    }
    return Promise.resolve(undefined);
  });
  return () => {
    engineCall.mockImplementation(
      previous ?? (() => Promise.resolve(undefined)),
    );
  };
};

const renderActivity = () =>
  renderVbaMoneyActivityHistory({ overrides: activityFlagOverrides });

describeForPlatforms('Money activity VBA history view', () => {
  let restoreEngine: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    setupV1AccountTransactionsApiMock();
  });

  afterEach(() => {
    restoreEngine?.();
    restoreEngine = undefined;
    restoreVbaReduxServiceStore();
    clearAccountsTransactionsApiMocks();
  });

  it('shows an empty activity list when the VBA transfer fetch returns none', async () => {
    restoreEngine = installVbaTransfers([]);
    const { findByTestId, queryByTestId } = renderActivity();

    expect(
      await findByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toHaveTextContent(strings('money.activity.empty'));
    expect(queryByTestId(MoneyActivityViewTestIds.LIST)).not.toBeOnTheScreen();
    expect(engineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVbaTransfers',
      expect.objectContaining({
        address: VBA_TEST_MONEY_ADDRESS.toLowerCase(),
      }),
    );
  });

  it('shows the activity load error when the VBA transfer fetch fails', async () => {
    restoreEngine = installVbaTransfers(new Error('fetchVbaTransfers failed'));
    const { findByTestId } = renderActivity();

    await waitFor(() =>
      expect(engineCall).toHaveBeenCalledWith(
        'MoneyAccountApiDataService:fetchVbaTransfers',
        expect.anything(),
      ),
    );

    expect(
      await findByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toHaveTextContent(strings('money.activity.load_error'));
  });
});
