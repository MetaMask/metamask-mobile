import { renderHook } from '@testing-library/react-hooks';
import {
  Reason,
  SecurityAlertResponse,
} from '../../legacy/components/BlockaidBanner/BlockaidBanner.types';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { useSecurityAlertResponse } from '../alerts/useSecurityAlertResponse';
import { ResultType as BlockaidResultType } from '../../constants/signatures';
import useBlockaidAlerts from './useBlockaidAlerts';
import { strings } from '../../../../../../locales/i18n';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';

jest.mock('../metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn().mockReturnValue({
    trackBlockaidAlertLinkClickedEvent: jest.fn(),
  }),
}));

jest.mock('./useSecurityAlertResponse', () => ({
  useSecurityAlertResponse: jest.fn(),
}));

jest.mock(
  '../../components/blockaid-alert-content/blockaid-alert-content',
  () => 'BlockaidAlertContent',
);

describe('useBlockaidAlerts', () => {
  const mockSecurityAlertResponse: SecurityAlertResponse = {
    result_type: BlockaidResultType.Malicious,
    reason: Reason.other,
    features: ['Feature 1', 'Feature 2'],
    block: 12345,
    req: {
      origin: 'https://example.com',
      method: 'eth_sign',
      params: ['param1', 'param2'],
    },
    chainId: '1',
  };
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: mockSecurityAlertResponse,
    });
  });

  it('returns an empty array when there is no security alert response', () => {
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: null,
    });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when the result type is ignored', () => {
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: {
        ...mockSecurityAlertResponse,
        result_type: BlockaidResultType.Benign,
      },
    });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current).toEqual([]);
  });

  const EXPECTED_MESSAGE_BLOCKAID_ALERT =
    'If you confirm this request, you could lose your assets. We recommend that you cancel this request.';
  const testCases = [
    {
      resultType: BlockaidResultType.Malicious,
      expectedSeverity: Severity.Danger,
      expectedMessage: EXPECTED_MESSAGE_BLOCKAID_ALERT,
      description: 'Malicious result type',
    },
    {
      resultType: BlockaidResultType.Warning,
      expectedSeverity: Severity.Warning,
      expectedMessage: EXPECTED_MESSAGE_BLOCKAID_ALERT,
      description: 'Warning result type',
    },
    {
      resultType: 'unknown',
      expectedSeverity: Severity.Info,
      expectedMessage: EXPECTED_MESSAGE_BLOCKAID_ALERT,
      description: 'default result type',
    },
  ];

  it.each(testCases)(
    'returns an alert when there is a valid security alert response with $description',
    ({ resultType, expectedSeverity, expectedMessage }) => {
      (useSecurityAlertResponse as jest.Mock).mockReturnValue({
        securityAlertResponse: {
          ...mockSecurityAlertResponse,
          result_type: resultType,
        },
      });

      const { result } = renderHook(() => useBlockaidAlerts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        key: RowAlertKey.Blockaid,
        content: expect.any(Object),
        title: 'This is a deceptive request',
        message: expectedMessage,
        severity: expectedSeverity,
      });
    },
  );

  it('calls onContactUsClicked when the report link is clicked', () => {
    const mockTrackBlockaidAlertLinkClickedEvent = jest.fn();

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackBlockaidAlertLinkClickedEvent:
        mockTrackBlockaidAlertLinkClickedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);

    const { result } = renderHook(() => useBlockaidAlerts());

    const selectAlert = result.current[0];
    const onContactUsClicked = selectAlert.content?.props.onContactUsClicked;

    onContactUsClicked();

    expect(mockTrackBlockaidAlertLinkClickedEvent).toHaveBeenCalledTimes(1);
  });

  it.each`
    reason                           | expectedMessageKey
    ${Reason.rawSignatureFarming}    | ${'alert_system.confirm_modal.blockaid.message'}
    ${Reason.approvalFarming}        | ${'alert_system.confirm_modal.blockaid.message1'}
    ${Reason.permitFarming}          | ${'alert_system.confirm_modal.blockaid.message1'}
    ${Reason.transferFarming}        | ${'alert_system.confirm_modal.blockaid.message2'}
    ${Reason.transferFromFarming}    | ${'alert_system.confirm_modal.blockaid.message2'}
    ${Reason.rawNativeTokenTransfer} | ${'alert_system.confirm_modal.blockaid.message2'}
    ${Reason.seaportFarming}         | ${'alert_system.confirm_modal.blockaid.message3'}
    ${Reason.blurFarming}            | ${'alert_system.confirm_modal.blockaid.message4'}
    ${Reason.maliciousDomain}        | ${'alert_system.confirm_modal.blockaid.message5'}
    ${Reason.tradeOrderFarming}      | ${'alert_system.confirm_modal.blockaid.message'}
    ${Reason.other}                  | ${'alert_system.confirm_modal.blockaid.message'}
  `(
    'returns the correct description for $reason',
    ({ reason, expectedMessageKey }) => {
      (useSecurityAlertResponse as jest.Mock).mockReturnValue({
        securityAlertResponse: { ...mockSecurityAlertResponse, reason },
      });

      const { result } = renderHook(() => useBlockaidAlerts());

      expect(result.current).toHaveLength(1);
      const expectedMessage = strings(expectedMessageKey);
      expect(result.current[0].message).toBe(expectedMessage);
    },
  );
});
