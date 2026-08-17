import { renderHook } from '@testing-library/react-hooks';
import {
  Reason,
  SecurityAlertResponse,
} from '../../components/blockaid-banner/BlockaidBanner.types';
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

jest.mock('./useSendingAssetsFiatTotal', () => ({
  useSendingAssetsFiatTotal: jest.fn(() => null),
}));

const mockUseSendingAssetsFiatTotal = jest.requireMock(
  './useSendingAssetsFiatTotal',
).useSendingAssetsFiatTotal;

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
    mockUseSendingAssetsFiatTotal.mockReturnValue(null);
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
    "Security partners found high-risk signals in this request. If you continue, your funds can't be recovered.";
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
        title: 'Risk signals detected',
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
    const onContactUsClicked = (
      selectAlert.content?.props as { onContactUsClicked: () => void }
    ).onContactUsClicked;

    onContactUsClicked();

    expect(mockTrackBlockaidAlertLinkClickedEvent).toHaveBeenCalledTimes(1);
  });

  it.each`
    reason                             | expectedRequestTypeKey
    ${Reason.approvalFarming}          | ${'blockaid_banner.request_type.approval'}
    ${Reason.permitFarming}            | ${'blockaid_banner.request_type.approval'}
    ${Reason.setApprovalForAllFarming} | ${'blockaid_banner.request_type.approval'}
    ${Reason.seaportFarming}           | ${'blockaid_banner.request_type.approval'}
    ${Reason.blurFarming}              | ${'blockaid_banner.request_type.approval'}
    ${Reason.transferFarming}          | ${'blockaid_banner.request_type.transfer'}
    ${Reason.transferFromFarming}      | ${'blockaid_banner.request_type.transfer'}
    ${Reason.rawNativeTokenTransfer}   | ${'blockaid_banner.request_type.transfer'}
    ${Reason.rawSignatureFarming}      | ${'blockaid_banner.request_type.signature'}
    ${Reason.tradeOrderFarming}        | ${'blockaid_banner.request_type.signature'}
    ${Reason.maliciousDomain}          | ${'blockaid_banner.request_type.request'}
    ${Reason.other}                    | ${'blockaid_banner.request_type.request'}
    ${'unmapped_reason'}               | ${'blockaid_banner.request_type.request'}
  `(
    'composes the confirm modal message with the request type for $reason',
    ({ reason, expectedRequestTypeKey }) => {
      (useSecurityAlertResponse as jest.Mock).mockReturnValue({
        securityAlertResponse: { ...mockSecurityAlertResponse, reason },
      });

      const { result } = renderHook(() => useBlockaidAlerts());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].message).toBe(
        strings('alert_system.confirm_modal.blockaid_message', {
          requestType: strings(expectedRequestTypeKey),
        }),
      );
    },
  );

  it('includes the amount in the confirm modal message when a sending fiat total is available', () => {
    mockUseSendingAssetsFiatTotal.mockReturnValue('$1,234.56');
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: {
        ...mockSecurityAlertResponse,
        reason: Reason.transferFarming,
      },
    });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current[0].message).toBe(
      strings('alert_system.confirm_modal.blockaid_message_with_amount', {
        requestType: strings('blockaid_banner.request_type.transfer'),
        amount: '$1,234.56',
      }),
    );
    expect(
      (result.current[0].content?.props as { sendingFiatTotal: string })
        .sendingFiatTotal,
    ).toBe('$1,234.56');
  });

  it.each`
    reason                             | expectedTitleKey
    ${Reason.approvalFarming}          | ${'blockaid_banner.high_risk_approval_title'}
    ${Reason.permitFarming}            | ${'blockaid_banner.high_risk_approval_title'}
    ${Reason.setApprovalForAllFarming} | ${'blockaid_banner.high_risk_approval_title'}
    ${Reason.seaportFarming}           | ${'blockaid_banner.high_risk_approval_title'}
    ${Reason.blurFarming}              | ${'blockaid_banner.high_risk_approval_title'}
    ${Reason.transferFarming}          | ${'blockaid_banner.high_risk_transfer_title'}
    ${Reason.transferFromFarming}      | ${'blockaid_banner.high_risk_transfer_title'}
    ${Reason.rawNativeTokenTransfer}   | ${'blockaid_banner.high_risk_transfer_title'}
    ${Reason.rawSignatureFarming}      | ${'blockaid_banner.high_risk_signature_title'}
    ${Reason.tradeOrderFarming}        | ${'blockaid_banner.high_risk_signature_title'}
    ${Reason.maliciousDomain}          | ${'blockaid_banner.site_flagged_unsafe_title'}
    ${Reason.other}                    | ${'blockaid_banner.risk_signals_detected_title'}
    ${Reason.failed}                   | ${'blockaid_banner.failed_title'}
    ${'unmapped_reason'}               | ${'blockaid_banner.risk_signals_detected_title'}
  `('returns the title for $reason', ({ reason, expectedTitleKey }) => {
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: { ...mockSecurityAlertResponse, reason },
    });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe(strings(expectedTitleKey));
  });
});
