import { renderHook } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useMoneyAccountCardLinkage from '../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import {
  isMoneyDepositTx,
  isMoneyWithdrawTx,
  getMMPayChainIds,
} from '../utils/moneyTransactionGuards';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { MonetizedPrimitive } from '../../../../core/Analytics/MetaMetrics.types';
import {
  SCREEN_NAMES,
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_SURFACE_TYPES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  MONEY_ONBOARDING_STEP_ACTIONS,
} from '../constants/moneyEvents';
import { useMoneyAnalytics } from './useMoneyAnalytics';

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    URLS: {
      MONEY_LANDING: 'https://mock.money.landing',
      MUSD_PRICE: 'https://mock.musd.price',
    },
    CARD: {
      CARD_FEES_URL: 'https://mock.card.fees',
    },
  },
}));

jest.mock('../../../../constants/urls', () => ({
  METAMASK_SUPPORT_URL: 'https://mock.metamask.support',
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');
jest.mock('../../Card/hooks/useMoneyAccountCardLinkage');
jest.mock('./useMoneyAccountBalance');

jest.mock('../utils/moneyTransactionGuards', () => ({
  isMoneyDepositTx: jest.fn(),
  isMoneyWithdrawTx: jest.fn(),
  getMMPayChainIds: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, opts?: { locale?: string }) =>
    opts?.locale === 'en' ? `en:${key}` : `localized:${key}`,
}));

const mockIsMoneyDepositTx = isMoneyDepositTx as jest.MockedFunction<
  typeof isMoneyDepositTx
>;
const mockIsMoneyWithdrawTx = isMoneyWithdrawTx as jest.MockedFunction<
  typeof isMoneyWithdrawTx
>;
const mockGetMMPayChainIds = getMMPayChainIds as jest.MockedFunction<
  typeof getMMPayChainIds
>;

const mockBuiltEvent = { mock: 'built_event' };
const mockBuild = jest.fn().mockReturnValue(mockBuiltEvent);
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });
const mockTrackEvent = jest.fn();

const baseTx = {
  id: 'tx-1',
  status: TransactionStatus.confirmed,
  time: 0,
  txParams: {},
  chainId: '0x1' as `0x${string}`,
} as unknown as TransactionMeta;

const makeTx = (
  type: TransactionType,
  extra: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({ ...baseTx, type, ...extra }) as unknown as TransactionMeta;

describe('useMoneyAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    (useMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
      isCardLinkedToMoneyAccount: false,
      isCardAuthenticated: false,
    });
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatRaw: '0',
    });
    mockBuild.mockReturnValue(mockBuiltEvent);
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });

    mockIsMoneyDepositTx.mockReturnValue(false);
    mockIsMoneyWithdrawTx.mockReturnValue(false);
    mockGetMMPayChainIds.mockReturnValue({
      sourceChainId: undefined,
      destinationChainId: undefined,
    });
  });

  describe('base properties', () => {
    it('includes screen_name in event payload when provided', () => {
      const { result } = renderHook(() =>
        useMoneyAnalytics({ screen_name: SCREEN_NAMES.MONEY_HOME }),
      );

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ screen_name: SCREEN_NAMES.MONEY_HOME }),
      );
    });

    it('includes bottom_sheet_name in event payload when provided', () => {
      const { result } = renderHook(() =>
        useMoneyAnalytics({
          bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
        }),
      );

      result.current.trackBottomSheetViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
        }),
      );
    });

    it('includes component_name in event payload when provided', () => {
      const { result } = renderHook(() =>
        useMoneyAnalytics({ component_name: undefined }),
      );

      result.current.trackComponentViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.not.objectContaining({ component_name: expect.anything() }),
      );
    });

    it('sets is_card_linked_to_money_account from linkage hook', () => {
      (useMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
        isCardLinkedToMoneyAccount: true,
        isCardAuthenticated: false,
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ is_card_linked_to_money_account: true }),
      );
    });

    it('sets is_card_holder from isCardAuthenticated', () => {
      (useMoneyAccountCardLinkage as jest.Mock).mockReturnValue({
        isCardLinkedToMoneyAccount: false,
        isCardAuthenticated: true,
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ is_card_holder: true }),
      );
    });

    it('sets is_account_funded to true when totalFiatRaw is greater than 0', () => {
      (useMoneyAccountBalance as jest.Mock).mockReturnValue({
        totalFiatRaw: '100.50',
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ is_account_funded: true }),
      );
    });

    it('sets is_account_funded to false when totalFiatRaw is "0"', () => {
      (useMoneyAccountBalance as jest.Mock).mockReturnValue({
        totalFiatRaw: '0',
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ is_account_funded: false }),
      );
    });

    it('sets is_account_funded to false when totalFiatRaw is null', () => {
      (useMoneyAccountBalance as jest.Mock).mockReturnValue({
        totalFiatRaw: null,
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ is_account_funded: false }),
      );
    });

    it('sets is_account_funded to false when totalFiatRaw is undefined', () => {
      (useMoneyAccountBalance as jest.Mock).mockReturnValue({
        totalFiatRaw: undefined,
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ is_account_funded: false }),
      );
    });

    describe('is_money_balance_loading', () => {
      it('sets is_money_balance_loading to true and is_account_funded to null during initial fetch', () => {
        (useMoneyAccountBalance as jest.Mock).mockReturnValue({
          totalFiatRaw: undefined,
          isBalanceFetching: true,
        });
        const { result } = renderHook(() => useMoneyAnalytics());

        result.current.trackScreenViewed();

        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            is_money_balance_loading: true,
            is_account_funded: null,
          }),
        );
      });

      it('sets is_money_balance_loading to false and is_account_funded to false when settled with zero balance', () => {
        (useMoneyAccountBalance as jest.Mock).mockReturnValue({
          totalFiatRaw: '0',
          isBalanceFetching: false,
        });
        const { result } = renderHook(() => useMoneyAnalytics());

        result.current.trackScreenViewed();

        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            is_money_balance_loading: false,
            is_account_funded: false,
          }),
        );
      });

      it('does not null out is_account_funded during a background refetch when cached value exists', () => {
        (useMoneyAccountBalance as jest.Mock).mockReturnValue({
          totalFiatRaw: '100',
          isBalanceFetching: true,
        });
        const { result } = renderHook(() => useMoneyAnalytics());

        result.current.trackScreenViewed();

        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            is_money_balance_loading: false,
            is_account_funded: true,
          }),
        );
      });
    });
  });

  describe('trackButtonClicked', () => {
    it('fires the MONEY_BUTTON_CLICKED event', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_BUTTON_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(mockBuiltEvent);
    });

    it('resolves label_en and label_localized from label_key for TEXT button', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.add_money',
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          label_localized: 'localized:money.add_money',
          label_en: 'en:money.add_money',
        }),
      );
    });

    it('passes label_en and label_localized through unchanged when supplied directly', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_en: 'Add Money',
        label_localized: "Ajouter de l'argent",
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          label_en: 'Add Money',
          label_localized: "Ajouter de l'argent",
        }),
      );
    });

    it('omits label fields for ICON button type', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.not.objectContaining({
          label_en: expect.anything(),
          label_localized: expect.anything(),
        }),
      );
    });

    it('adds redirect_target_type when redirect_target is a SCREEN_NAMES value', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_target: SCREEN_NAMES.MONEY_HOME,
          redirect_target_type: 'screen',
        }),
      );
    });

    it('adds redirect_target_type when redirect_target is a BOTTOM_SHEET_NAMES value', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        redirect_target: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ redirect_target_type: 'bottom_sheet' }),
      );
    });

    it('omits redirect_target_type when no redirect_target is provided', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.not.objectContaining({
          redirect_target_type: expect.anything(),
        }),
      );
    });
  });

  describe('trackTokenButtonClicked', () => {
    const tokenProps = {
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_en: 'Add',
      label_localized: 'Add',
      token_symbol: 'ETH',
      token_position_in_list: 1,
      token_chain_id: '0x1',
      tokens_in_list: 3,
    } as const;

    it('fires the MONEY_BUTTON_CLICKED event with token row properties', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackTokenButtonClicked(tokenProps);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          token_symbol: 'ETH',
          token_position_in_list: 1,
          token_chain_id: '0x1',
          tokens_in_list: 3,
        }),
      );
    });

    it('adds redirect_target_type when redirect_target is present', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackTokenButtonClicked({
        ...tokenProps,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ redirect_target_type: 'screen' }),
      );
    });
  });

  describe('trackSurfaceClicked', () => {
    it('fires the MONEY_SURFACE_CLICKED event', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackSurfaceClicked({
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_SURFACE_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(mockBuiltEvent);
    });

    it('merges redirect_target and base properties in payload', () => {
      const { result } = renderHook(() =>
        useMoneyAnalytics({ screen_name: SCREEN_NAMES.MONEY_HOME }),
      );

      result.current.trackSurfaceClicked({
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          screen_name: SCREEN_NAMES.MONEY_HOME,
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          redirect_target_type: 'screen',
        }),
      );
    });
  });

  describe('trackActivitySurfaceClicked', () => {
    it('sets transaction_type to moneyAccountDeposit snake_cased for deposit tx', () => {
      mockIsMoneyDepositTx.mockReturnValue(true);
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackActivitySurfaceClicked({
        transaction: makeTx(TransactionType.contractInteraction),
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: 'money_account_deposit' }),
      );
    });

    it('sets transaction_type to moneyAccountWithdraw snake_cased for withdraw tx', () => {
      mockIsMoneyDepositTx.mockReturnValue(false);
      mockIsMoneyWithdrawTx.mockReturnValue(true);
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackActivitySurfaceClicked({
        transaction: makeTx(TransactionType.contractInteraction),
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: 'money_account_withdraw' }),
      );
    });

    it('uses snake_cased transaction.type for non-money tx', () => {
      mockIsMoneyDepositTx.mockReturnValue(false);
      mockIsMoneyWithdrawTx.mockReturnValue(false);
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackActivitySurfaceClicked({
        transaction: makeTx(TransactionType.contractInteraction),
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: 'contract_interaction' }),
      );
    });

    it('sets chain_id_source and chain_id_destination from getMMPayChainIds', () => {
      mockGetMMPayChainIds.mockReturnValue({
        sourceChainId: '0x1',
        destinationChainId: '0x89',
      });
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackActivitySurfaceClicked({
        transaction: makeTx(TransactionType.moneyAccountDeposit),
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id_source: '0x1',
          chain_id_destination: '0x89',
        }),
      );
    });

    it('sets monetized_primitive to MoneyAccount', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackActivitySurfaceClicked({
        transaction: makeTx(TransactionType.moneyAccountDeposit),
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          monetized_primitive: MonetizedPrimitive.MoneyAccount,
        }),
      );
    });

    it('includes transaction_status from the transaction', () => {
      const { result } = renderHook(() => useMoneyAnalytics());
      const tx = makeTx(TransactionType.moneyAccountDeposit);

      result.current.trackActivitySurfaceClicked({
        transaction: tx,
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_status: TransactionStatus.confirmed,
        }),
      );
    });
  });

  describe('trackTooltipClicked', () => {
    it('fires the MONEY_TOOLTIP_CLICKED event with tooltip name and type', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackTooltipClicked({
        tooltip_name: MONEY_TOOLTIP_NAMES.MONEY_BALANCE,
        tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_TOOLTIP_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          tooltip_name: MONEY_TOOLTIP_NAMES.MONEY_BALANCE,
          tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
        }),
      );
    });
  });

  describe('trackSurfaceViewed', () => {
    it('trackScreenViewed fires MONEY_SURFACE_VIEWED with surface_type SCREEN', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackScreenViewed();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_SURFACE_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          surface_type: MONEY_SURFACE_TYPES.SCREEN,
        }),
      );
    });

    it('trackBottomSheetViewed fires MONEY_SURFACE_VIEWED with surface_type BOTTOM_SHEET', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackBottomSheetViewed();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_SURFACE_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          surface_type: MONEY_SURFACE_TYPES.BOTTOM_SHEET,
        }),
      );
    });

    it('trackComponentViewed fires MONEY_SURFACE_VIEWED with surface_type COMPONENT', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackComponentViewed();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_SURFACE_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          surface_type: MONEY_SURFACE_TYPES.COMPONENT,
        }),
      );
    });
  });

  describe('trackOnboardingEvent', () => {
    it('fires MONEY_ONBOARDING_EVENT with step, step_title, and total_steps', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackOnboardingEvent({
        step: 1,
        step_title: 'Add Funds',
        total_steps: 3,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_ONBOARDING_EVENT,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 1,
          step_title: 'Add Funds',
          total_steps: 3,
        }),
      );
    });

    it('includes step_action when provided', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackOnboardingEvent({
        step: 2,
        step_title: 'Link Card',
        total_steps: 3,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.GET_CARD,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.GET_CARD,
        }),
      );
    });

    it('adds redirect_target_type when redirect_target is provided', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackOnboardingEvent({
        step: 1,
        step_title: 'Get Started',
        total_steps: 3,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          redirect_target_type: 'screen',
        }),
      );
    });

    it('omits redirect_target_type when no redirect_target is provided', () => {
      const { result } = renderHook(() => useMoneyAnalytics());

      result.current.trackOnboardingEvent({
        step: 1,
        step_title: 'Get Started',
        total_steps: 3,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.not.objectContaining({
          redirect_target_type: expect.anything(),
        }),
      );
    });
  });
});
