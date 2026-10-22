import { GasFeeToken, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { useIsGaslessSupported } from './useIsGaslessSupported';
import { useHasInsufficientBalance } from '../useHasInsufficientBalance';
import { useIsGaslessLoading } from './useIsGaslessLoading';
import { isMusdRescueSendTx } from '../../../../UI/Money/utils/moneyTransactionGuards';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectUseTransactionSimulations } from '../../../../../selectors/preferencesController';

jest.mock('./useIsGaslessSupported');
jest.mock('../../../../UI/Money/utils/moneyTransactionGuards', () => ({
  isMusdRescueSendTx: jest.fn(),
}));
jest.mock('../useHasInsufficientBalance');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../selectors/preferencesController');

const mockedUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);
const mockedUseHasInsufficientBalance = jest.mocked(useHasInsufficientBalance);
const mockedUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockSelectUseTransactionSimulations = jest.mocked(
  selectUseTransactionSimulations,
);
const mockIsMusdRescueSendTx = jest.mocked(isMusdRescueSendTx);

async function runHook({
  simulationEnabled,
  gaslessSupported,
  insufficientBalance,
  pending = false,
  isSmartTransaction = true,
  gasFeeTokens,
  excludeNativeTokenForFee,
  selectedGasFeeToken,
  rescueSend = false,
  transactionSponsored = true,
  transactionType,
}: {
  simulationEnabled: boolean;
  gaslessSupported: boolean;
  insufficientBalance: boolean;
  pending?: boolean;
  isSmartTransaction?: boolean;
  gasFeeTokens?: GasFeeToken[];
  excludeNativeTokenForFee?: boolean;
  selectedGasFeeToken?: Hex;
  rescueSend?: boolean;
  transactionSponsored?: boolean;
  transactionType?: TransactionType;
}) {
  mockIsMusdRescueSendTx.mockReturnValue(rescueSend);
  mockedUseIsGaslessSupported.mockReturnValue({
    isSupported: gaslessSupported,
    isSmartTransaction,
    pending,
  });
  mockedUseHasInsufficientBalance.mockReturnValue({
    hasInsufficientBalance: insufficientBalance,
    nativeCurrency: 'USD',
  });
  mockedUseTransactionMetadataRequest.mockReturnValue({
    gasFeeTokens,
    excludeNativeTokenForFee,
    selectedGasFeeToken,
    isGasFeeSponsored: transactionSponsored,
    type: transactionType,
  } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
  mockSelectUseTransactionSimulations.mockReturnValue(simulationEnabled);
  const { result } = renderHookWithProvider(useIsGaslessLoading);
  return result.current;
}

describe('useIsGaslessLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true if pending', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      pending: true,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('returns false if simulation is disabled', async () => {
    const result = await runHook({
      simulationEnabled: false,
      gaslessSupported: true,
      insufficientBalance: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns false if gasless is not supported', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: false,
      insufficientBalance: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns false if there is no insufficient balance', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: false,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns true if gas fee tokens are undefined (still loading)', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: undefined, // this triggers loading
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('returns false if gas fee tokens are present', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [{ tokenAddress: '0x123' }] as unknown as GasFeeToken[],
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('allows empty fee tokens for a sponsored Money Account mUSD rescue send', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [],
      rescueSend: true,
      transactionSponsored: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('continues waiting for fee tokens for an unsponsored rescue send', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [],
      rescueSend: true,
      transactionSponsored: false,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('returns true if gas fee tokens is an empty array', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [],
      transactionSponsored: false,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('returns false for a sponsored transaction with an empty gas fee tokens array', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [],
      transactionSponsored: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns false for a sponsored transaction with non-empty gas fee tokens', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [{ tokenAddress: '0x123' }] as unknown as GasFeeToken[],
      transactionSponsored: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('keeps waiting for a sponsored transaction while gasless support is pending', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: false,
      pending: true,
      insufficientBalance: true,
      gasFeeTokens: [],
      transactionSponsored: true,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('does not block a sponsored transaction once gasless is finished and unsupported', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: false,
      pending: false,
      insufficientBalance: true,
      gasFeeTokens: [],
      transactionSponsored: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('keeps waiting for a sponsored transaction while gas fee tokens are undefined', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: undefined,
      transactionSponsored: true,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('keeps waiting for fee tokens for a revoke delegation transaction flagged as sponsored', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [],
      transactionSponsored: true,
      transactionType: TransactionType.revokeDelegation,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('returns false if gas fee tokens are present and dont match selectedGasFeeToken (non-reg)', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [{ tokenAddress: '0x123' }] as unknown as GasFeeToken[],
      selectedGasFeeToken: '0x456',
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns true if gas fee tokens are present and dont match selectedGasFeeToken with excludeNativeTokenForFee being true (Tempo)', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [{ tokenAddress: '0x123' }] as unknown as GasFeeToken[],
      selectedGasFeeToken: '0x456',
      excludeNativeTokenForFee: true,
    });

    expect(result.isGaslessLoading).toBe(true);
  });

  it('returns false if gas fee tokens are present AND match selectedGasFeeToken with excludeNativeTokenForFee being true (Tempo)', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [
        { tokenAddress: '0x123' },
        { tokenAddress: '0x789' },
      ] as unknown as GasFeeToken[],
      // Matches the first one
      selectedGasFeeToken: '0x123',
      excludeNativeTokenForFee: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns false if gas fee tokens are present AND selectedGasFeeToken is undefined with excludeNativeTokenForFee being true (Tempo)', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [{ tokenAddress: '0x123' }] as unknown as GasFeeToken[],
      selectedGasFeeToken: undefined,
      excludeNativeTokenForFee: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });

  it('returns false if gas fee tokens is empty array with excludeNativeTokenForFee being true (Tempo)', async () => {
    const result = await runHook({
      simulationEnabled: true,
      gaslessSupported: true,
      insufficientBalance: true,
      gasFeeTokens: [] as unknown as GasFeeToken[],
      selectedGasFeeToken: '0x456',
      excludeNativeTokenForFee: true,
    });

    expect(result.isGaslessLoading).toBe(false);
  });
});
