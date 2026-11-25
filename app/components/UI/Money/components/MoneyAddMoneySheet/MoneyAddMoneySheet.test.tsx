import React from 'react';
import { Platform } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType, CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useQuickDepositStablecoins } from '../../hooks/useQuickDepositStablecoins';
import type { QuickDepositStablecoinOption } from '../../utils/quickDepositStablecoins';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { ConfirmationLaunchSource } from '../../../../Views/confirmations/components/confirm/confirm-component';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../../Ramp/hooks/useRegionHasFiatProvider';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import {
  selectMoneyMovementNeobank,
  selectNeobankMarkets,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectUsableVbaAutoramp } from '../../../../../selectors/rampsController';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../../Earn/constants/musd';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { startVbaCufJourney } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTrace';
import { VBA_CUF_ENTRY_SURFACE } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTags';
import { selectMoneyAccountAccessBlockReason } from '../../selectors/visibility';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting',
  () => ({
    openVbaEntry: jest.fn(),
  }),
);
jest.mock('../../../Ramp/Views/VirtualBankAccount/vbaCufTrace', () => ({
  startVbaCufJourney: jest.fn(),
}));

const mockStartVbaCufJourney = jest.mocked(startVbaCufJourney);

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockInitiateDeposit = jest.fn(() => Promise.resolve());

let mockRouteParams: object | undefined;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});

jest.mock('../../hooks/useQuickDepositStablecoins', () => ({
  useQuickDepositStablecoins: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig',
  () => ({
    useMMPayFiatConfig: jest.fn(),
  }),
);

jest.mock('../../../Ramp/hooks/useRegionHasFiatProvider', () => ({
  useRegionHasFiatProvider: jest.fn(),
}));

jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  ...jest.requireActual('../../../../../selectors/tokenBalancesController'),
  selectHasAnyNonZeroTokenBalance: jest.fn(),
}));

jest.mock('../../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../../selectors/transactionController'),
  selectHasUnapprovedTransactions: jest.fn(() => false),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/moneyAccount',
    ),
    selectMoneyMovementNeobank: jest.fn(),
    selectNeobankMarkets: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/rampsController', () => ({
  ...jest.requireActual('../../../../../selectors/rampsController'),
  selectUsableVbaAutoramp: jest.fn(),
}));

jest.mock('../../../../../selectors/geolocationController', () => ({
  ...jest.requireActual('../../../../../selectors/geolocationController'),
  selectGeolocationLocation: jest.fn(),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('../../selectors/visibility', () => ({
  ...jest.requireActual('../../selectors/visibility'),
  selectMoneyAccountAccessBlockReason: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyAddMoneySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;

    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
    });
    (useQuickDepositStablecoins as jest.Mock).mockReturnValue(undefined);
    (useMoneyAccountDeposit as jest.Mock).mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (useRegionHasFiatProvider as jest.Mock).mockReturnValue(true);
    (selectMoneyMovementNeobank as unknown as jest.Mock).mockReturnValue({
      chooseCurrency: false,
      regionOverride: undefined,
    });
    (selectNeobankMarkets as unknown as jest.Mock).mockReturnValue([
      { currency: 'BRL', regions: ['BR'] },
    ]);
    (selectUsableVbaAutoramp as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    (selectGeolocationLocation as unknown as jest.Mock).mockReturnValue('BR');
    (
      selectMoneyAccountAccessBlockReason as unknown as jest.Mock
    ).mockReturnValue(undefined);
    delete process.env.MM_MONEY_VBA_GEO_BYPASS;
  });

  describe('Money account availability', () => {
    it('redirects to the feature-unavailable modal when Money is disabled', () => {
      (
        selectMoneyAccountAccessBlockReason as unknown as jest.Mock
      ).mockReturnValue('feature_disabled');

      const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      expect(queryByTestId(MoneyAddMoneySheetTestIds.CONTAINER)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MONEY.MODALS.DEEPLINK_MODAL,
        {
          title: strings('money.deeplink_modal.money_account_disabled.title'),
          description: strings(
            'money.deeplink_modal.money_account_disabled.description',
          ),
        },
      );
    });

    it('redirects to the geo-block sheet when Money is geo-ineligible', () => {
      (
        selectMoneyAccountAccessBlockReason as unknown as jest.Mock
      ).mockReturnValue('geo_blocked');

      const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      expect(queryByTestId(MoneyAddMoneySheetTestIds.CONTAINER)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
      });
    });
  });

  it('renders all options', () => {
    const { getByText, queryByText, queryByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Debit card or Apple Pay')).toBeOnTheScreen();
    expect(getByText('Bank transfer')).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
    ).toBeNull();
    expect(queryByText('External address')).toBeNull();
    // Bank transfer is live with a "No fees" badge; External address row is gone.
    expect(queryByText('Coming soon')).toBeNull();
    expect(getByText('No fees')).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW),
    ).toBeNull();
  });

  it('renders the deposit option as "Debit card" without Apple Pay on Android', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'android';

    try {
      const { getByText, queryByText, getByTestId } = renderWithProvider(
        <MoneyAddMoneySheet />,
      );

      expect(getByText('Debit card')).toBeOnTheScreen();
      expect(queryByText('Debit card or Apple Pay')).toBeNull();
      expect(
        getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
      ).toBeOnTheScreen();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('renders the "Add funds" title', () => {
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Add funds')).toBeOnTheScreen();
  });

  it('initiates a deposit with autoSelectFiatPayment when Deposit funds is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      autoSelectFiatPayment: true,
      intent: 'card',
    });
  });

  it.each([
    [
      'Convert crypto',
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      { intent: 'convert' },
    ],
    [
      'Deposit funds',
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
      { autoSelectFiatPayment: true, intent: 'card' },
    ],
  ])(
    'forwards the launch source of the caller that opened the sheet when %s is pressed',
    (_label, testID, expectedOptions) => {
      mockRouteParams = { launchedFrom: ConfirmationLaunchSource.Rewards };

      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(getByTestId(testID));

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        ...expectedOptions,
        launchedFrom: ConfirmationLaunchSource.Rewards,
      });
    },
  );

  it('initiates a deposit when Convert crypto is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({ intent: 'convert' });
  });

  it('hides the Deposit funds option when moneyAccountDeposit is not in enabledTransactionTypes', () => {
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeNull();
  });

  it('hides the Deposit funds option when the region has no usable fiat provider', () => {
    (useRegionHasFiatProvider as jest.Mock).mockReturnValue(false);

    const { queryByTestId, getByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeNull();
    // Other options are unaffected.
    expect(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
    ).toBeNull();
    expect(
      getByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW),
    ).toBeNull();
  });

  it('shows the Deposit funds option when the region has a usable fiat provider', () => {
    (useRegionHasFiatProvider as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('gates on the mUSD-on-Monad asset id', () => {
    renderWithProvider(<MoneyAddMoneySheet />);

    expect(useRegionHasFiatProvider).toHaveBeenCalledWith(
      MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD],
    );
  });

  it('disables the Convert crypto option when no account has any crypto balance', () => {
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      false,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('enables the Convert crypto option when at least one account has a crypto balance', () => {
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      true,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({ intent: 'convert' });
  });

  it('shows the Deposit funds option when fiat deposit is enabled', () => {
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('hides the Deposit funds option when fiat deposit is disabled', () => {
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeNull();
  });

  it('navigates to MM Pay with autoSelectFiatPayment when Debit card or Apple Pay is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      autoSelectFiatPayment: true,
      intent: 'card',
    });
  });

  it('keeps Debit card or Apple Pay active with no coming-soon rows', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(queryByText('Coming soon')).toBeNull();

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      autoSelectFiatPayment: true,
      intent: 'card',
    });
  });

  // Returns the option-row testIDs in rendered order. Each row carries its
  // testID on both the composite TouchableOpacity and its host view, so we
  // dedupe to first occurrence (which preserves render order).
  const getOptionOrder = (
    root: ReturnType<typeof renderWithProvider>['UNSAFE_root'],
    optionTestIds: string[] = [
      MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    ],
  ): string[] => {
    const seen = new Set<string>();
    return root
      .findAll((node) => optionTestIds.includes(node.props.testID))
      .map((node) => node.props.testID as string)
      .filter((id) => {
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
  };

  it('keeps the original order, with Bank account first, when all options are enabled', () => {
    const { UNSAFE_root } = renderWithProvider(<MoneyAddMoneySheet />);
    const order = getOptionOrder(UNSAFE_root);

    expect(order).toEqual([
      MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    ]);
  });

  it('moves a disabled option (Convert crypto) to the bottom of the order', () => {
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      false,
    );

    const { UNSAFE_root } = renderWithProvider(<MoneyAddMoneySheet />);
    const order = getOptionOrder(UNSAFE_root);

    expect(order).toEqual([
      MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
    ]);
  });

  describe('stablecoin quick deposit', () => {
    const tokenAddress = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as const;

    const option = (
      symbol: QuickDepositStablecoinOption['symbol'],
      intent: QuickDepositStablecoinOption['intent'],
    ): QuickDepositStablecoinOption => ({
      symbol,
      intent,
      aggregatedBalance: '65',
      preferredPaymentToken: {
        address: tokenAddress,
        chainId: CHAIN_IDS.BASE,
      },
    });

    const symbols = [
      ['USDC', 'addUsdc'],
      ['USDT', 'addUsdt'],
      ['mUSD', 'addMusd'],
    ] as const;

    it.each(symbols)('shows %s on the row', (symbol, intent) => {
      (useQuickDepositStablecoins as jest.Mock).mockReturnValue(
        option(symbol, intent),
      );

      const { getByTestId, getByText } = renderWithProvider(
        <MoneyAddMoneySheet />,
      );

      expect(
        getByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
      ).toBeOnTheScreen();
      expect(getByText('$65.00')).toBeOnTheScreen();
      expect(getByText(symbol)).toBeOnTheScreen();
    });

    it.each(symbols)(
      'deposits with %s when the row is pressed',
      (symbol, intent) => {
        (useQuickDepositStablecoins as jest.Mock).mockReturnValue(
          option(symbol, intent),
        );

        const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

        fireEvent.press(
          getByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
        );

        expect(mockInitiateDeposit).toHaveBeenCalledWith({
          intent,
          preferredPaymentToken: {
            address: tokenAddress,
            chainId: CHAIN_IDS.BASE,
          },
        });
      },
    );

    it.each(symbols)('tracks %s when the row is pressed', (symbol, intent) => {
      (useQuickDepositStablecoins as jest.Mock).mockReturnValue(
        option(symbol, intent),
      );

      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(
        getByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_STABLECOIN,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        deposit_intent: intent,
        deposit_token_symbol: symbol,
        deposit_token_chain_id: CHAIN_IDS.BASE,
      });
    });

    it('hides the stablecoin row, including Add mUSD, when the account holds none', () => {
      (useQuickDepositStablecoins as jest.Mock).mockReturnValue(undefined);
      const { queryByTestId, queryByText } = renderWithProvider(
        <MoneyAddMoneySheet />,
      );
      expect(
        queryByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
      ).toBeNull();
      expect(queryByText('Add mUSD')).toBeNull();
    });

    it('renders after the other enabled options', () => {
      (useQuickDepositStablecoins as jest.Mock).mockReturnValue(
        option('USDC', 'addUsdc'),
      );

      const { UNSAFE_root } = renderWithProvider(<MoneyAddMoneySheet />);
      const order = getOptionOrder(UNSAFE_root, [
        MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
        MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
        MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
        MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION,
      ]);

      expect(order).toEqual([
        MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
        MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
        MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
        MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION,
      ]);
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_ADD_MONEY_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyAddMoneySheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyAddMoneySheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });

    it('calls trackSurfaceClicked with BANK_ACCOUNT component when "Bank transfer" row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_BANK_ACCOUNT,
        redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
      });
      expect(mockStartVbaCufJourney).toHaveBeenCalledWith(
        VBA_CUF_ENTRY_SURFACE.ADD_MONEY_SHEET,
      );
    });

    it('calls trackSurfaceClicked with CONVERT_CRYPTO component when "Convert crypto" row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(
        getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_CONVERT_CRYPTO,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('calls trackSurfaceClicked with DEPOSIT_FUNDS component when "Deposit funds" row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(
        getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });
  });
});
