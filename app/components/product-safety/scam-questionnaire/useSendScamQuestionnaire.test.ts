import { renderHook, act } from '@testing-library/react-hooks';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { useSendScamQuestionnaire } from './useSendScamQuestionnaire';
import { AlertKeys } from '../../Views/confirmations/constants/alerts';
import { ResultType } from '../../Views/confirmations/constants/signatures';
import { MMM_ORIGIN } from '../../Views/confirmations/constants/confirmations';
import { useAlerts } from '../../Views/confirmations/context/alert-system-context';
import { useSecurityAlertResponse } from '../../Views/confirmations/hooks/alerts/useSecurityAlertResponse';
import { useTransactionMetadataRequest } from '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';

jest.mock('../../Views/confirmations/context/alert-system-context');
jest.mock('../../Views/confirmations/hooks/alerts/useSecurityAlertResponse');
jest.mock(
  '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);

const mockUseAlerts = jest.mocked(useAlerts);
const mockUseSecurityAlertResponse = jest.mocked(useSecurityAlertResponse);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

const setAlertConfirmed = jest.fn();

function setup({
  transactionType = TransactionType.simpleSend,
  origin = MMM_ORIGIN,
  resultType = ResultType.Malicious,
}: {
  transactionType?: TransactionType;
  origin?: string;
  resultType?: ResultType;
} = {}) {
  mockUseAlerts.mockReturnValue({ setAlertConfirmed } as never);
  mockUseSecurityAlertResponse.mockReturnValue({
    securityAlertResponse: { result_type: resultType } as never,
  });
  mockUseTransactionMetadataRequest.mockReturnValue({
    type: transactionType,
    origin,
  } as unknown as TransactionMeta);

  const onReject = jest.fn().mockResolvedValue(undefined);
  const view = renderHook(() => useSendScamQuestionnaire({ onReject }));
  return { ...view, onReject };
}

describe('useSendScamQuestionnaire', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isScamQuestionnaireRequired', () => {
    it('is true for a malicious MetaMask send', () => {
      const { result } = setup();
      expect(result.current.isScamQuestionnaireRequired).toBe(true);
    });

    it('is false when the PPOM verdict is not malicious', () => {
      const { result } = setup({ resultType: ResultType.Warning });
      expect(result.current.isScamQuestionnaireRequired).toBe(false);
    });

    it('is false when the transaction is not a MetaMask send', () => {
      const { result } = setup({ origin: 'https://dapp.example' });
      expect(result.current.isScamQuestionnaireRequired).toBe(false);
    });

    it('is false for a non-transfer transaction type', () => {
      const { result } = setup({
        transactionType: TransactionType.contractInteraction,
      });
      expect(result.current.isScamQuestionnaireRequired).toBe(false);
    });
  });

  it('showScamQuestionnaire opens the modal', () => {
    const { result } = setup();
    expect(result.current.isScamQuestionnaireVisible).toBe(false);

    act(() => {
      result.current.showScamQuestionnaire();
    });

    expect(result.current.isScamQuestionnaireVisible).toBe(true);
  });

  it('onCleanPass marks completed, confirms the blockaid alert, and hides the modal', () => {
    const { result } = setup();
    act(() => {
      result.current.showScamQuestionnaire();
    });

    act(() => {
      result.current.scamQuestionnaireProps.onCleanPass();
    });

    expect(setAlertConfirmed).toHaveBeenCalledWith(AlertKeys.Blockaid, true);
    expect(result.current.isScamQuestionnaireCompleted).toBe(true);
    expect(result.current.isScamQuestionnaireVisible).toBe(false);
    // Once completed it is no longer required on subsequent confirm taps.
    expect(result.current.isScamQuestionnaireRequired).toBe(false);
  });

  it('onBypass behaves like a clean pass', () => {
    const { result } = setup();
    act(() => {
      result.current.showScamQuestionnaire();
    });

    act(() => {
      result.current.scamQuestionnaireProps.onBypass();
    });

    expect(setAlertConfirmed).toHaveBeenCalledWith(AlertKeys.Blockaid, true);
    expect(result.current.isScamQuestionnaireCompleted).toBe(true);
    expect(result.current.isScamQuestionnaireVisible).toBe(false);
  });

  it('onReject rejects to wallet home and hides the modal', async () => {
    const { result, onReject } = setup();
    act(() => {
      result.current.showScamQuestionnaire();
    });

    await act(async () => {
      await result.current.scamQuestionnaireProps.onReject();
    });

    expect(onReject).toHaveBeenCalledWith(
      providerErrors.userRejectedRequest(),
      false,
      true,
    );
    expect(result.current.isScamQuestionnaireVisible).toBe(false);
  });

  it('onDismiss hides the modal without completing', () => {
    const { result } = setup();
    act(() => {
      result.current.showScamQuestionnaire();
    });

    act(() => {
      result.current.scamQuestionnaireProps.onDismiss();
    });

    expect(result.current.isScamQuestionnaireVisible).toBe(false);
    expect(result.current.isScamQuestionnaireCompleted).toBe(false);
    expect(setAlertConfirmed).not.toHaveBeenCalled();
  });
});
