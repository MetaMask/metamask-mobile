import { renderHook } from '@testing-library/react-hooks';
import { Reason, SecurityAlertResponse } from '../../components/BlockaidBanner/BlockaidBanner.types';
import { RowAlertKey } from '../../components/UI/InfoRow/AlertRow/constants';
import { Severity } from '../../types/alerts';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useSecurityAlertResponse } from '../useSecurityAlertResponse';
import { useSignatureRequest } from '../useSignatureRequest';
import { ResultType as BlockaidResultType } from '../../constants/signatures';
import useBlockaidAlerts from './useBlockaidAlerts';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../../../util/confirmation/signatureUtils', () => ({
  getAnalyticsParams: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics');

jest.mock('../useSecurityAlertResponse', () => ({
  useSecurityAlertResponse: jest.fn(),
}));

jest.mock('../useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

jest.mock('../../components/Confirm/BlockaidAlertContent/BlockaidAlertContent', () => 'BlockaidAlertContent');

describe('useBlockaidAlerts', () => {
  const mockSignatureRequest = {
    type: 'eth_sign',
    messageParams: { from: '0x123' },
  };

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

  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSignatureRequest as jest.Mock).mockReturnValue(mockSignatureRequest);
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({ securityAlertResponse: mockSecurityAlertResponse });
    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });
  });

  it('returns an empty array when there is no security alert response', () => {
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({ securityAlertResponse: null });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when the result type is ignored', () => {
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: { ...mockSecurityAlertResponse, result_type: BlockaidResultType.Benign },
    });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current).toEqual([]);
  });

  it.each`
    resultType                    | expectedSeverity     | description
    ${BlockaidResultType.Malicious} | ${Severity.Danger}    | ${'Malicious result type'}
    ${BlockaidResultType.Warning}   | ${Severity.Warning}   | ${'Warning result type'}
    ${'unknown'}                    | ${Severity.Info}      | ${'default result type'}
  `('returns an alert when there is a valid security alert response with $description', ({ resultType, expectedSeverity }) => {
    (useSecurityAlertResponse as jest.Mock).mockReturnValue({
      securityAlertResponse: { ...mockSecurityAlertResponse, result_type: resultType },
    });

    const { result } = renderHook(() => useBlockaidAlerts());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      key: RowAlertKey.Blockaid,
      content: expect.any(Object),
      title: 'This is a deceptive request',
      severity: expectedSeverity,
    });
  });

  it('calls onContactUsClicked when the report link is clicked', () => {
    const { result } = renderHook(() => useBlockaidAlerts());

    const selectAlert = result.current[0];
    const onContactUsClicked = selectAlert.content?.props.onContactUsClicked;

    onContactUsClicked();

    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'Signature Requested',
      properties: {
        external_link_clicked: 'security_alert_support_link',
      },
      saveDataRecording: true,
      sensitiveProperties: {},
    });
  });
});
