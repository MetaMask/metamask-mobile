import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useApprovalRequest from '../useApprovalRequest';
import { GO_BACK_TYPES, useTransactionConfirm } from './useTransactionConfirm';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import Routes from '../../../../../constants/navigation/Routes';
import { replaceWithTransactionsView } from '../../../../../util/navigation/replaceWithTransactionsView';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { flushPromises } from '../../../../../util/test/utils';
import { useSelectedGasFeeToken } from '../gas/useGasFeeToken';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { act } from '@testing-library/react-hooks';
import { useTransactionPayQuotes } from '../pay/useTransactionPayData';
import { TransactionPayQuote } from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { useGaslessSupportedSmartTransactions } from '../gas/useGaslessSupportedSmartTransactions';
import { useMusdConfirmNavigation } from '../../../../UI/Earn/hooks/useMusdConfirmNavigation';
import { isHardwareAccount } from '../../../../../util/address';
import { useParams } from '../../../../../util/navigation/navUtils';
import { PayWithOption } from '../../components/confirm/confirm-component';
import { useFiatConfirm } from '../pay/useFiatConfirm';
import { useHandleHwSend } from '../../../../UI/HardwareWallet/Swaps/useHandleHwSend';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockMusdNavigateOnConfirm = jest.fn();

jest.mock('../../../../../util/navigation/replaceWithTransactionsView', () => ({
  replaceWithTransactionsView: jest.fn(),
}));
jest.mock('../useApprovalRequest');
jest.mock('./useTransactionMetadataRequest');
jest.mock('../../../../../selectors/smartTransactionsController');
jest.mock('../ui/useFullScreenConfirmation');
jest.mock('../../../../../util/networks');
jest.mock('../../../../hooks/useNetworkEnablement/useNetworkEnablement');
jest.mock('../gas/useGasFeeToken');
jest.mock('../../../../../util/transactions/sentinel-api');
jest.mock('../pay/useTransactionPayData');
jest.mock('../gas/useIsGaslessSupported');
jest.mock('../gas/useGaslessSupportedSmartTransactions');
jest.mock('../../../../UI/Earn/hooks/useMusdConfirmNavigation');
jest.mock('../../../../../util/address');
jest.mock('../pay/useFiatConfirm');
jest.mock('../../../../../util/navigation/navUtils');
jest.mock('../../../../UI/HardwareWallet/Swaps/useHandleHwSend', () => ({
  useHandleHwSend: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const CHAIN_ID_MOCK = '0x123';

// ---------- Top-level mocks (referenced by beforeEach and tests) ----------

const useApprovalRequestMock = jest.mocked(useApprovalRequest);
const onApprovalConfirm = jest.fn();
const useFullScreenConfirmationMock = jest.mocked(useFullScreenConfirmation);
const useNetworkEnablementMock = jest.mocked(useNetworkEnablement);
const useSelectedGasFeeTokenMock = jest.mocked(useSelectedGasFeeToken);
const isSendBundleSupportedMock = jest.mocked(isSendBundleSupported);
const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
const useIsGaslessSupportedMock = jest.mocked(useIsGaslessSupported);
const useGaslessSupportedSmartTransactionsMock = jest.mocked(
  useGaslessSupportedSmartTransactions,
);
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useMusdConfirmNavigationMock = jest.mocked(useMusdConfirmNavigation);
const isHardwareAccountMock = jest.mocked(isHardwareAccount);
const useHandleHwSendMock = jest.mocked(useHandleHwSend);
const onFiatConfirmMock = jest.fn();
const useParamsMock = jest.mocked(useParams);

function renderHook() {
  return renderHookWithProvider(() => useTransactionConfirm(), {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

// ---------- Hardware-wallet send helpers (shared by the HW-send branch tests) ----------

const gasFeeToken = (
  overrides: {
    tokenAddress?: string;
  } = {},
) =>
  ({
    tokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    symbol: 'USDC',
    transferTransaction: {
      data: '0xabc',
      to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      value: '0x0',
    },
    gas: '0x5208',
    maxFeePerGas: '0x1',
    maxPriorityFeePerGas: '0x2',
    ...overrides,
  }) as unknown as ReturnType<typeof useSelectedGasFeeToken>;

// Shared mock-config factory for the HW-send cases. Returns the spy the
// SUT invokes as `handleHwSend`. `fires` controls whether the HW branch
// short-circuits the normal confirm path (defaults to true — these cases
// exercise the HW-send routing). The displayContext/totalSteps logic now
// lives inside useHandleHwSend (mocked), so these tests assert the
// SUT assembles and forwards the prepared metadata correctly.
function setupHwSend(
  opts: {
    isHardware?: boolean;
    type?: TransactionType;
    txParamsOverride?: Record<string, unknown>;
    gasFeeToken?: unknown;
    stxSupported?: boolean;
    fires?: boolean;
  } = {},
) {
  const shouldDeferSpy = jest.fn(
    (_transactionMetadata: TransactionMeta) => opts.fires ?? true,
  );
  const deferSpy = jest.fn();
  useHandleHwSendMock.mockReturnValue({
    shouldDefer: shouldDeferSpy,
    defer: deferSpy,
  });
  isHardwareAccountMock.mockReturnValue(opts.isHardware ?? true);
  useSelectedGasFeeTokenMock.mockReturnValue(
    (opts.gasFeeToken ?? undefined) as unknown as ReturnType<
      typeof useSelectedGasFeeToken
    >,
  );
  if (opts.stxSupported !== undefined) {
    useGaslessSupportedSmartTransactionsMock.mockReturnValue({
      isSupported: opts.stxSupported,
      isSmartTransaction: opts.stxSupported,
      pending: false,
    });
  }
  useTransactionMetadataRequestMock.mockReturnValue({
    id: transactionIdMock,
    chainId: CHAIN_ID_MOCK,
    origin: ORIGIN_METAMASK,
    type: opts.type ?? TransactionType.simpleSend,
    txParams: {
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      value: '0x64',
      ...opts.txParamsOverride,
    },
  } as unknown as TransactionMeta);
  return deferSpy;
}

// Wraps setupHwSend + renderHook + act(onConfirm); returns the spy.
async function renderAndConfirm(opts: Parameters<typeof setupHwSend>[0] = {}) {
  const spy = setupHwSend(opts);
  const { result } = renderHook();
  await act(async () => {
    await result.current.onConfirm();
  });
  return spy;
}

describe('useTransactionConfirm', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    useParamsMock.mockReturnValue({});

    jest.mocked(useFiatConfirm).mockReturnValue({
      onFiatConfirm: onFiatConfirmMock,
      isFiatPaymentSelected: false,
      orderId: undefined,
    });

    isHardwareAccountMock.mockReturnValue(false);

    useHandleHwSendMock.mockReturnValue({
      shouldDefer: jest.fn(() => false),
      defer: jest.fn(),
    });

    useMusdConfirmNavigationMock.mockReturnValue({
      navigateOnConfirm: mockMusdNavigateOnConfirm,
    });

    useIsGaslessSupportedMock.mockReturnValue({
      isSmartTransaction: true,
      isSupported: true,
      pending: false,
    });

    useGaslessSupportedSmartTransactionsMock.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
      pending: false,
    });

    useApprovalRequestMock.mockReturnValue({
      onConfirm: onApprovalConfirm,
    } as unknown as ReturnType<typeof useApprovalRequest>);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: CHAIN_ID_MOCK,
      origin: ORIGIN_METAMASK,
      txParams: {},
    } as unknown as TransactionMeta);

    useFullScreenConfirmationMock.mockReturnValue({
      isFullScreenConfirmation: true,
    });

    useNetworkEnablementMock.mockReturnValue({
      tryEnableEvmNetwork: jest.fn(),
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    useTransactionPayQuotesMock.mockReturnValue([]);
  });

  it('confirms approval request', async () => {
    const { result } = renderHook();

    await result.current.onConfirm();

    expect(onApprovalConfirm).toHaveBeenCalled();
  });

  it('sets waitForResult true when not smart tx, no quotes, no fee token', async () => {
    useSelectedGasFeeTokenMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof useSelectedGasFeeToken>,
    );
    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: true,
      }),
      expect.anything(),
    );
  });

  it('does not wait for result if smart transaction', async () => {
    useGaslessSupportedSmartTransactionsMock.mockReturnValue({
      isSupported: true,
      isSmartTransaction: true,
      pending: false,
    });

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: false,
      }),
      expect.anything(),
    );
  });

  it('waits for result if hardware wallet even with quotes', async () => {
    isHardwareAccountMock.mockReturnValue(true);
    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: CHAIN_ID_MOCK,
      txParams: { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
    } as unknown as TransactionMeta);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: true,
      }),
      expect.anything(),
    );
  });

  it('does not wait for result if quotes', async () => {
    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: false,
      }),
      expect.anything(),
    );
  });

  it('calls tryEnableEvmNetwork', async () => {
    const tryEnableEvmNetworkMock = jest.fn();

    useNetworkEnablementMock.mockReturnValue({
      tryEnableEvmNetwork: tryEnableEvmNetworkMock,
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });
    await flushPromises();

    expect(tryEnableEvmNetworkMock).toHaveBeenCalledWith(CHAIN_ID_MOCK);
  });

  it('calls onError callback on approval failure', async () => {
    const testError = new Error('Test error');
    onApprovalConfirm.mockRejectedValueOnce(testError);
    const onError = jest.fn();

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm({ onError });
    });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('still navigates on error when onError is not provided', async () => {
    onApprovalConfirm.mockRejectedValueOnce(new Error('Test error'));

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.onConfirm()).resolves.toBeUndefined();
    });

    expect(replaceWithTransactionsView).toHaveBeenCalled();
  });

  it('does nothing when transactionMetadata is missing', async () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).not.toHaveBeenCalled();
  });

  it('returns false for chainSupportsSendBundle when chainId is undefined', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: undefined,
    } as unknown as TransactionMeta);

    isSendBundleSupportedMock.mockResolvedValue(true);

    useGaslessSupportedSmartTransactionsMock.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
      pending: false,
    });

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(isSendBundleSupportedMock).not.toHaveBeenCalled();
    expect(onApprovalConfirm).toHaveBeenCalled();
  });

  describe('navigates to', () => {
    it('perps market if perps deposit', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    });

    it('money home if perps deposit with MoneyAccount payWithOption', async () => {
      useParamsMock.mockReturnValue({
        payWithOption: PayWithOption.MoneyAccount,
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('money home if predict deposit with MoneyAccount payWithOption', async () => {
      useParamsMock.mockReturnValue({
        payWithOption: PayWithOption.MoneyAccount,
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.predictDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('goes back if predict deposit without MoneyAccount payWithOption', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.predictDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('money home if money account deposit', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.moneyAccountDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('money home if money account deposit is a nested batch transaction', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.batch,
        nestedTransactions: [
          { type: TransactionType.tokenMethodApprove },
          { type: TransactionType.moneyAccountDeposit },
        ],
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('skips navigation if perps deposit and order (caller handles navigation)', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDepositAndOrder,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('calls musdConversionNavigateOnConfirm if musdConversion', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.musdConversion,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockMusdNavigateOnConfirm).toHaveBeenCalled();
    });

    it('transactions if full screen', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(replaceWithTransactionsView).toHaveBeenCalled();
    });

    it('previous page if not full screen', async () => {
      useFullScreenConfirmationMock.mockReturnValue({
        isFullScreenConfirmation: false,
      });

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it.each(GO_BACK_TYPES)(
      'navigates to previous page if $type',
      async (type) => {
        useFullScreenConfirmationMock.mockReturnValue({
          isFullScreenConfirmation: true,
        });

        useTransactionMetadataRequestMock.mockReturnValue({
          id: transactionIdMock,
          type,
        } as TransactionMeta);

        const { result } = renderHook();
        await result.current.onConfirm();

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      },
    );
  });

  describe('isGasFeeSponsored override', () => {
    it('clears isGasFeeSponsored when gasless is not supported', async () => {
      useIsGaslessSupportedMock.mockReturnValue({
        isSmartTransaction: false,
        isSupported: false,
        pending: false,
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        origin: ORIGIN_METAMASK,
        txParams: {},
        isGasFeeSponsored: true,
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isGasFeeSponsored: false,
        }),
      });
    });

    it('preserves isGasFeeSponsored when gasless is supported', async () => {
      useIsGaslessSupportedMock.mockReturnValue({
        isSmartTransaction: true,
        isSupported: true,
        pending: false,
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        origin: ORIGIN_METAMASK,
        txParams: {},
        isGasFeeSponsored: true,
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isGasFeeSponsored: true,
        }),
      });
    });

    it('clears isGasFeeSponsored for revoke delegation when gasless is supported', async () => {
      useIsGaslessSupportedMock.mockReturnValue({
        isSmartTransaction: true,
        isSupported: true,
        pending: false,
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        origin: ORIGIN_METAMASK,
        txParams: {},
        type: TransactionType.revokeDelegation,
        isGasFeeSponsored: true,
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isGasFeeSponsored: false,
        }),
      });
    });

    it('clears isGasFeeSponsored even without selectedGasFeeToken', async () => {
      useIsGaslessSupportedMock.mockReturnValue({
        isSmartTransaction: false,
        isSupported: false,
        pending: false,
      });

      useSelectedGasFeeTokenMock.mockReturnValue(
        undefined as unknown as ReturnType<typeof useSelectedGasFeeToken>,
      );

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        origin: ORIGIN_METAMASK,
        txParams: {},
        isGasFeeSponsored: true,
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isGasFeeSponsored: false,
        }),
      });
    });
  });

  describe('handleSmartTransaction', () => {
    beforeEach(() => {
      useGaslessSupportedSmartTransactionsMock.mockReturnValue({
        isSupported: true,
        isSmartTransaction: true,
        pending: false,
      });
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(true));
      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc', to: '0xdef', value: '0x0' },
        gas: '0x5208',
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x2',
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);
    });

    it('adds batchTransactions and gas properties when smart transaction is enabled', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          batchTransactions: [
            expect.objectContaining({ data: '0xabc', to: '0xdef' }),
          ],
          txParams: expect.objectContaining({
            gas: '0x5208',
            maxFeePerGas: '0x1',
            maxPriorityFeePerGas: '0x2',
          }),
        }),
      });
    });

    it('does nothing if selectedGasFeeToken missing', async () => {
      useSelectedGasFeeTokenMock.mockReturnValue(
        undefined as unknown as ReturnType<typeof useSelectedGasFeeToken>,
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.not.objectContaining({
          batchTransactions: expect.any(Array),
        }),
      });
    });

    it('does nothing if isGasFeeTokenIgnoredIfBalance', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        isGasFeeTokenIgnoredIfBalance: true,
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.not.objectContaining({
          batchTransactions: expect.any(Array),
        }),
      });
    });

    it('adds batchTransactions for hardware wallets when smart transaction is enabled', async () => {
      isHardwareAccountMock.mockReturnValue(true);
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        txParams: { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          batchTransactions: [
            expect.objectContaining({ data: '0xabc', to: '0xdef' }),
          ],
          txParams: expect.objectContaining({
            gas: '0x5208',
            maxFeePerGas: '0x1',
            maxPriorityFeePerGas: '0x2',
          }),
        }),
      });
    });
  });

  describe('handleGasless7702', () => {
    it('sets isExternalSign when selectedGasFeeToken is present and not smart transaction', async () => {
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(false));

      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc' },
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isExternalSign: true,
        }),
      });
    });

    it('sets isExternalSign when selectedGasFeeToken is present and smart transaction but the chain does not support send bundle', async () => {
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(false));

      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc' },
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isExternalSign: true,
        }),
      });
    });

    it('does nothing if selectedGasFeeToken is missing', async () => {
      useSelectedGasFeeTokenMock.mockReturnValue(
        undefined as unknown as ReturnType<typeof useSelectedGasFeeToken>,
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.not.objectContaining({ isExternalSign: true }),
      });
    });

    it('does nothing if isGasFeeTokenIgnoredIfBalance', async () => {
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(false));

      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc' },
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);

      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        isGasFeeTokenIgnoredIfBalance: true,
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.not.objectContaining({ isExternalSign: true }),
      });
    });
  });

  describe('isExternalSign revert for unsupported accounts', () => {
    // Regression: on gas-sponsorship chains (e.g. Monad, SEI) the
    // TransactionController sets `isExternalSign = true` from
    // `isGasFeeSponsored` during gas simulation regardless of account type.
    // For hardware wallets no relay is eligible (HW cannot hold an EIP-7702
    // delegation), so leaving the flag set skips device signing and an empty
    // `0x` payload reaches eth_sendRawTransaction. The fix reverts the flag
    // whenever gasless sponsorship cannot apply for the account/chain.

    it('reverts isExternalSign when gasless is unsupported (hardware wallet on sponsored chain)', async () => {
      isHardwareAccountMock.mockReturnValue(true);
      useIsGaslessSupportedMock.mockReturnValue({
        isSupported: false,
        isSmartTransaction: false,
        pending: false,
      });
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        isGasFeeSponsored: true,
        isExternalSign: true,
        txParams: { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isExternalSign: false,
          isGasFeeSponsored: false,
        }),
      });
    });

    it('keeps isExternalSign when gasless is supported (EOA relay path intact)', async () => {
      isHardwareAccountMock.mockReturnValue(false);
      useIsGaslessSupportedMock.mockReturnValue({
        isSupported: true,
        isSmartTransaction: true,
        pending: false,
      });
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        chainId: CHAIN_ID_MOCK,
        isGasFeeSponsored: true,
        isExternalSign: true,
        txParams: { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
      } as unknown as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isExternalSign: true,
          isGasFeeSponsored: true,
        }),
      });
    });
  });

  describe('fiat payment branching', () => {
    it('calls onFiatConfirm and returns early when fiat is selected and no orderId', async () => {
      jest.mocked(useFiatConfirm).mockReturnValue({
        onFiatConfirm: onFiatConfirmMock,
        isFiatPaymentSelected: true,
        orderId: undefined,
      });

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onFiatConfirmMock).toHaveBeenCalled();
      expect(onApprovalConfirm).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('proceeds with normal confirmation when fiat is selected and orderId exists', async () => {
      jest.mocked(useFiatConfirm).mockReturnValue({
        onFiatConfirm: onFiatConfirmMock,
        isFiatPaymentSelected: true,
        orderId: 'order-abc',
      });

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onFiatConfirmMock).not.toHaveBeenCalled();
      expect(onApprovalConfirm).toHaveBeenCalled();
    });

    it('skips fiat branch when existingOrderId is provided', async () => {
      jest.mocked(useFiatConfirm).mockReturnValue({
        onFiatConfirm: onFiatConfirmMock,
        isFiatPaymentSelected: true,
        orderId: undefined,
      });

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm({ existingOrderId: 'order-existing' });
      });

      expect(onFiatConfirmMock).not.toHaveBeenCalled();
      expect(onApprovalConfirm).toHaveBeenCalled();
    });

    it('does not affect non-fiat confirmation flow', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onFiatConfirmMock).not.toHaveBeenCalled();
      expect(onApprovalConfirm).toHaveBeenCalled();
    });
  });

  describe('hardware wallet send branch', () => {
    it('plain native send: routes through handleHwSend with prepared metadata and skips approval confirm', async () => {
      const spy = await renderAndConfirm();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.simpleSend,
          txParams: expect.objectContaining({
            to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          }),
        }),
      );
      expect(onApprovalConfirm).not.toHaveBeenCalled();
    });

    it('ERC-20 send (tokenMethodTransfer): routes through handleHwSend', async () => {
      // The decoded amount + symbol now live inside useHandleHwSend; here we
      // assert the branch fires for ERC-20 transfers and the prepared
      // metadata is forwarded.
      const spy = await renderAndConfirm({
        type: TransactionType.tokenMethodTransfer,
        txParamsOverride: {
          to: '0x15d34AAf54267DB7D7c367839Aaf71A00a2C6A65',
          value: '0x0',
          data: '0xa9059cbb0000000000000000000000000recipient0000000000000000000000000000000000000000000000000000000000000000000000003b',
        },
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.tokenMethodTransfer,
          txParams: expect.objectContaining({
            to: '0x15d34AAf54267DB7D7c367839Aaf71A00a2C6A65',
          }),
        }),
      );
      expect(onApprovalConfirm).not.toHaveBeenCalled();
    });

    it('sendbundle send (STX + gas token): handleHwSend receives prepared metadata carrying batchTransactions + gas overrides', async () => {
      const spy = await renderAndConfirm({
        stxSupported: true,
        gasFeeToken: gasFeeToken(),
      });

      // preparedTxMeta carries the gas-token's gas overrides (from
      // handleSmartTransaction) + the appended batchTransactions.
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          batchTransactions: [
            expect.objectContaining({
              to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
            }),
          ],
          txParams: expect.objectContaining({
            gas: '0x5208',
            maxFeePerGas: '0x1',
            maxPriorityFeePerGas: '0x2',
          }),
        }),
      );
      expect(onApprovalConfirm).not.toHaveBeenCalled();
    });

    it('non-HW send: handleHwSend does not fire, approval confirm runs', async () => {
      await renderAndConfirm({
        fires: false,
        isHardware: false,
        txParamsOverride: {
          from: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
        },
      });

      expect(onApprovalConfirm).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
        expect.anything(),
      );
    });

    it('HW non-send type (contractInteraction): handleHwSend declines, approval confirm runs', async () => {
      // The simpleSend/tokenMethodTransfer type guard now lives inside
      // useHandleHwSend (mocked to decline here); we assert the SUT falls
      // through to the normal confirm path.
      await renderAndConfirm({
        fires: false,
        type: TransactionType.contractInteraction,
        txParamsOverride: {
          to: '0x15d34AAf54267DB7D7c367839Aaf71A00a2C6A65',
          value: '0x0',
        },
      });

      expect(onApprovalConfirm).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
        expect.anything(),
      );
    });

    it('gas token selected but STX NOT supported: prepared metadata passed to handleHwSend has no batchTransactions', async () => {
      // Guards that handleSmartTransaction only populates batchTransactions
      // when isGaslessSupportedSTX; a gas token without STX must NOT append a
      // batch. (The totalSteps decision now lives inside useHandleHwSend.)
      const spy = await renderAndConfirm({
        stxSupported: false,
        gasFeeToken: gasFeeToken(),
      });

      expect(spy).toHaveBeenCalled();
      const prepared = spy.mock.calls[0]?.[0] as TransactionMeta | undefined;
      expect(prepared?.batchTransactions).toBeUndefined();
    });

    it('STX with transferTransaction but no tokenAddress: prepared metadata still carries batchTransactions', async () => {
      // Guards that handleSmartTransaction appends the transferTransaction to
      // batchTransactions regardless of tokenAddress. (The totalSteps=1 guard
      // when gasTokenAddress is missing now lives inside useHandleHwSend.)
      const spy = await renderAndConfirm({
        stxSupported: true,
        // transferTransaction present (so handleSmartTransaction appends to
        // batchTransactions) but tokenAddress undefined.
        gasFeeToken: gasFeeToken({ tokenAddress: undefined }),
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          batchTransactions: [
            expect.objectContaining({
              to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
            }),
          ],
        }),
      );
    });
  });
});
