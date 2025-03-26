import useConfirmationAlerts from './useConfirmationAlerts';
import useBlockaidAlerts from './alerts/useBlockaidAlerts';
import useDomainMismatchAlerts from './alerts/signatures/useDomainMismatchAlerts';
import { Alert, Severity } from '../types/alerts';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { siweSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';

jest.mock('./alerts/useBlockaidAlerts');
jest.mock('./alerts/signatures/useDomainMismatchAlerts');

describe('useConfirmationAlerts', () => {
  const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
  const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
  const mockBlockaidAlerts: Alert[] = [
    {
      key: 'alert1',
      title: 'Test Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Warning,
      alertDetails: ALERT_DETAILS_MOCK,
    }
  ];
  const mockDomainMisMatchAlerts: Alert[] = [
    {
      key: 'domainMismatchAlert',
      title: 'Test Domain Mismatch Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
      alertDetails: ALERT_DETAILS_MOCK,
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useBlockaidAlerts as jest.Mock).mockReturnValue(mockBlockaidAlerts);
    (useDomainMismatchAlerts as jest.Mock).mockReturnValue(mockDomainMisMatchAlerts);
  });

  it('returns empty array if no alerts', () => {
    (useBlockaidAlerts as jest.Mock).mockReturnValue([]);
    (useDomainMismatchAlerts as jest.Mock).mockReturnValue([]);
    const { result } = renderHookWithProvider(() => useConfirmationAlerts());
    expect(result.current).toEqual([]);
  });

  it('returns blockaid alerts', () => {
    (useDomainMismatchAlerts as jest.Mock).mockReturnValue([]);
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: siweSignatureConfirmationState,
    });
    expect(result.current).toEqual(mockBlockaidAlerts);
  });

  it('returns domain mismatch alerts', () => {
    (useBlockaidAlerts as jest.Mock).mockReturnValue([]);
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: siweSignatureConfirmationState,
    });
    expect(result.current).toEqual(mockDomainMisMatchAlerts);
  });

  it('returns combined alerts when both blockaid and domain mismatch alerts are present', () => {
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: siweSignatureConfirmationState,
    });
    expect(result.current).toEqual([...mockBlockaidAlerts, ...mockDomainMisMatchAlerts]);
  });
});
