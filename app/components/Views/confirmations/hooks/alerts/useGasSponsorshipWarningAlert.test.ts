import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
  SimulationData,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useGasSponsorshipWarningAlert } from './useGasSponsorshipWarningAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { NETWORKS_CHAIN_ID } from '../../../../../constants/network';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../gas/useIsGaslessSupported');

const MONAD_CHAIN_ID = NETWORKS_CHAIN_ID.MONAD as Hex;
const MAINNET_CHAIN_ID = '0x1' as Hex;

/**
 * Helper type for simulation data with callTraceErrors
 */
type SimulationDataWithCallTraceErrors = SimulationData & {
  callTraceErrors?: string[];
};

const createMockSimulationData = (
  callTraceErrors?: string[],
): SimulationDataWithCallTraceErrors =>
  ({
    tokenBalanceChanges: [],
    callTraceErrors,
  }) as unknown as SimulationDataWithCallTraceErrors;

const createMockTransactionMeta = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: '1',
    status: TransactionStatus.unapproved,
    type: TransactionType.contractInteraction,
    chainId: MONAD_CHAIN_ID,
    isGasFeeSponsored: false,
    simulationData: undefined,
    ...overrides,
  }) as unknown as TransactionMeta;

describe('useGasSponsorshipWarningAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: true,
      isSmartTransaction: false,
      pending: false,
    });
  });

  describe('returns warning alert', () => {
    it('when callTraceErrors contains reserve balance violation on Monad', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData([
          'Reserve balance violation detected',
        ]),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        isBlocking: false,
        key: AlertKeys.GasSponsorshipReserveBalance,
        field: RowAlertKey.EstimatedFee,
        severity: Severity.Warning,
        title: 'Gas sponsorship unavailable',
      });
    });

    it('with correct message containing minBalance and nativeTokenSymbol', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData(['reserve balance violation']),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current[0].message).toContain('10');
      expect(result.current[0].message).toContain('MON');
    });

    it('when error message contains matcher in mixed case', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData(['RESERVE BALANCE VIOLATION']),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toHaveLength(1);
    });
  });

  describe('returns empty array', () => {
    it('when transaction metadata is undefined', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when simulationData is undefined', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        simulationData: undefined,
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when callTraceErrors is undefined', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        simulationData: createMockSimulationData(undefined),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when callTraceErrors is empty', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        simulationData: createMockSimulationData([]),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when chain has no sponsorship warning rules configured', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MAINNET_CHAIN_ID, // Mainnet - no rules configured
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData(['reserve balance violation']),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when callTraceErrors do not match any configured matchers', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData([
          'some other error',
          'another unrelated error',
        ]),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when isGasFeeSponsored is true', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: true,
        simulationData: createMockSimulationData(['reserve balance violation']),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when gasless is not supported on the network', () => {
      mockUseIsGaslessSupported.mockReturnValue({
        isSupported: false,
        isSmartTransaction: false,
        pending: false,
      });
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData(['reserve balance violation']),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });

    it('when chainId is missing from transaction metadata', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: undefined as unknown as Hex,
        simulationData: createMockSimulationData(['reserve balance violation']),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('error matching behavior', () => {
    it('matches partial error messages containing the matcher', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData([
          'Transaction failed: reserve balance violation - minimum 10 MON required',
        ]),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toHaveLength(1);
    });

    it('matches when any error in array contains the matcher', () => {
      const transactionMeta = createMockTransactionMeta({
        chainId: MONAD_CHAIN_ID,
        isGasFeeSponsored: false,
        simulationData: createMockSimulationData([
          'some unrelated error',
          'reserve balance violation',
          'another error',
        ]),
      });
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

      const { result } = renderHookWithProvider(() =>
        useGasSponsorshipWarningAlert(),
      );

      expect(result.current).toHaveLength(1);
    });
  });
});
