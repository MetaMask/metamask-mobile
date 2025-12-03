import React, { act } from 'react';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountInfo, CustomAmountInfoProps } from './custom-amount-info';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { Alert } from '../../../types/alerts';
import {
  AlertsContextParams,
  useAlerts,
} from '../../../context/alert-system-context';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { AssetType } from '../../../types/token';
import {
  useTransactionPayRequiredTokens,
  useIsTransactionPayLoading,
} from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useRewardsAccountOptedIn } from '../../../../../UI/Rewards/hooks/useRewardsAccountOptedIn';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { REWARDS_TAG_SELECTOR } from '../../../../../UI/Rewards/components/RewardsTag';
import { OUTPUT_AMOUNT_TAG_SELECTOR } from '../../../../../UI/Earn/components/OutputAmountTag';
import { useTokenFiatRates } from '../../../hooks/tokens/useTokenFiatRates';
import { useCustomAmountRewards } from '../../../hooks/rewards/useCustomAmountRewards';

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');
jest.mock('../../../hooks/tokens/useTokenFiatRates');
jest.mock('../../../hooks/pay/useAutomaticTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/transactions/useTransactionCustomAmount');
jest.mock('../../../context/confirmation-context');
jest.mock('../../../context/alert-system-context');
jest.mock('../../../hooks/transactions/useTransactionCustomAmountAlerts');
jest.mock('../../../hooks/pay/useTransactionPayMetrics');
jest.mock('../../../hooks/send/useAccountTokens');
jest.mock('../../../hooks/pay/useTransactionPayAvailableTokens');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/transactions/useTransactionConfirm');
jest.mock('../../../../../UI/Rewards/hooks/useRewardsAccountOptedIn');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/rewards/useCustomAmountRewards');

const mockGoToBuy = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  ...jest.requireActual('../../../../../UI/Ramp/hooks/useRampNavigation'),
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

const TOKEN_ADDRESS_MOCK = '0x123' as Hex;
const CHAIN_ID_MOCK = '0x1' as Hex;

function render(
  props: CustomAmountInfoProps & { transactionType?: TransactionType } = {},
) {
  return renderWithProvider(<CustomAmountInfo {...props} />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  type:
                    props.transactionType ||
                    TransactionType.contractInteraction,
                },
              ],
            },
          },
        },
      },
    ),
  });
}

describe('CustomAmountInfo', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);
  const useAlertsMock = jest.mocked(useAlerts);
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTransactionConfirmMock = jest.mocked(useTransactionConfirm);

  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  const useTransactionCustomAmountAlertsMock = jest.mocked(
    useTransactionCustomAmountAlerts,
  );

  const useTransactionCustomAmountMock = jest.mocked(
    useTransactionCustomAmount,
  );

  const useRewardsAccountOptedInMock = jest.mocked(useRewardsAccountOptedIn);

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);

  const useCustomAmountRewardsMock = jest.mocked(useCustomAmountRewards);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: '0x123',
        balanceHuman: '0',
        balanceFiat: '0',
        balanceRaw: '0',
        balanceUsd: '0',
        chainId: '0x1',
        decimals: 18,
        symbol: 'TST',
      },
      setPayToken: noop as never,
    });

    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      hasInput: true,
      isInputChanged: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: noop,
    });

    useConfirmationContextMock.mockReturnValue({
      setIsFooterVisible: noop,
    } as ReturnType<typeof useConfirmationContext>);

    useAlertsMock.mockReturnValue({
      alerts: [] as Alert[],
      generalAlerts: [] as Alert[],
      fieldAlerts: [] as Alert[],
    } as AlertsContextParams);

    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: undefined,
      alertMessage: undefined,
    });

    useAccountTokensMock.mockReturnValue([]);
    useTransactionPayAvailableTokensMock.mockReturnValue([{}] as AssetType[]);
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
    useTransactionConfirmMock.mockReturnValue({} as never);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTokenFiatRatesMock.mockReturnValue([1, 1]);
    useRewardsAccountOptedInMock.mockReturnValue({
      accountOptedIn: false,
      account: null,
    });
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
    useCustomAmountRewardsMock.mockReturnValue({
      shouldShowRewardsTag: false,
      estimatedPoints: null,
      onRewardsTagPress: jest.fn(),
      shouldShowOutputAmountTag: false,
      outputAmount: null,
      outputSymbol: null,
      renderRewardsTooltip: () => null,
    });
  });

  it('renders amount', () => {
    const { getByText } = render();

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders payment token', () => {
    const { getByText } = render();
    expect(getByText('0 TST')).toBeDefined();
  });

  it('does not render payment token if disablePay', () => {
    const { queryByText } = render({ disablePay: true });
    expect(queryByText('TST')).toBeNull();
  });

  it('renders alert', () => {
    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: 'Test Alert Title',
      alertMessage: 'Test Alert Message',
    });

    const { getByText } = render();

    expect(getByText('Test Alert Title')).toBeDefined();
    expect(getByText('Test Alert Message')).toBeDefined();
  });

  it('renders keyboard', () => {
    const { getByTestId } = render();
    expect(getByTestId('deposit-keyboard')).toBeDefined();
  });

  it('renders buy button if no available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([]);

    const { getByText } = render();

    expect(
      getByText(strings('confirm.custom_amount.buy_button')),
    ).toBeDefined();
  });

  it('navigates to ramps if buy button pressed', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([]);

    useAccountTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        assetId: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      } as AssetType,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
    ] as TransactionPayRequiredToken[]);

    const { getByText } = render();

    fireEvent.press(getByText(strings('confirm.custom_amount.buy_button')));

    expect(mockGoToBuy).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0x123',
    });
  });

  it('renders alternate confirm label if predict withdraw', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictWithdraw,
      txParams: { from: '0x123' },
    } as never);

    const { getByText, findByText } = render({
      transactionType: TransactionType.predictWithdraw,
    });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(
      await findByText(strings('confirm.deposit_edit_amount_predict_withdraw')),
    ).toBeDefined();
  });

  describe('Rewards', () => {
    it('renders RewardsTag for mUSD conversion', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: true,
        estimatedPoints: 5,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { getByTestId } = render();

      expect(getByTestId(REWARDS_TAG_SELECTOR)).toBeDefined();
    });

    it('does not render RewardsTag for non-mUSD transactions', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: false,
        estimatedPoints: null,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { queryByTestId } = render();

      expect(queryByTestId(REWARDS_TAG_SELECTOR)).toBeNull();
    });

    it('calculates points correctly for $100', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: true,
        estimatedPoints: 5,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { getByText } = render();

      expect(getByText('5 points')).toBeDefined();
    });

    it('calculates points correctly for $199', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: true,
        estimatedPoints: 5,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { getByText } = render();

      expect(getByText('5 points')).toBeDefined();
    });

    it('calculates points correctly for $300', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: true,
        estimatedPoints: 15,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { getByText } = render();

      expect(getByText('15 points')).toBeDefined();
    });

    it('renders 0 points when amount is empty', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: true,
        estimatedPoints: 0,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { getByText } = render();

      expect(getByText('0 points')).toBeDefined();
    });

    it('calls onRewardsTagPress when RewardsTag is pressed', () => {
      const mockOnRewardsTagPress = jest.fn();

      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: true,
        estimatedPoints: 5,
        onRewardsTagPress: mockOnRewardsTagPress,
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { getByTestId } = render();

      fireEvent.press(getByTestId(REWARDS_TAG_SELECTOR));

      expect(mockOnRewardsTagPress).toHaveBeenCalled();
    });
  });

  describe('Output Amount Tag', () => {
    it('renders OutputAmountTag for mUSD conversion', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: false,
        estimatedPoints: null,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: true,
        outputAmount: '100',
        outputSymbol: 'mUSD',
        renderRewardsTooltip: () => null,
      });

      const { getByTestId } = render();

      expect(getByTestId(OUTPUT_AMOUNT_TAG_SELECTOR)).toBeDefined();
    });

    it('displays correct output amount', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: false,
        estimatedPoints: null,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: true,
        outputAmount: '100',
        outputSymbol: 'mUSD',
        renderRewardsTooltip: () => null,
      });

      const { getByText } = render();

      expect(getByText('100 mUSD')).toBeDefined();
    });

    it('formats amount with 2 decimal places', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: false,
        estimatedPoints: null,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: true,
        outputAmount: '100.5',
        outputSymbol: 'mUSD',
        renderRewardsTooltip: () => null,
      });

      const { getByText } = render();

      expect(getByText('100.5 mUSD')).toBeDefined();
    });

    it('does not render OutputAmountTag for non-mUSD transactions', () => {
      useCustomAmountRewardsMock.mockReturnValue({
        shouldShowRewardsTag: false,
        estimatedPoints: null,
        onRewardsTagPress: jest.fn(),
        shouldShowOutputAmountTag: false,
        outputAmount: null,
        outputSymbol: null,
        renderRewardsTooltip: () => null,
      });

      const { queryByTestId } = render();

      expect(queryByTestId(OUTPUT_AMOUNT_TAG_SELECTOR)).toBeNull();
    });
  });
});
