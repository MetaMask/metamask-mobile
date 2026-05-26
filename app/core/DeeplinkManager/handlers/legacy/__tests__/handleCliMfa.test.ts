import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import { DEFAULT_APPROVAL_PAGE_LINK, handleCliMfa } from '../handleCliMfa';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('handleCliMfa', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the hosted dashboard login page when agentic-cli deeplink omits approvalPageLink', () => {
    handleCliMfa({
      intent: 'login',
      approvalId: 'approval-1',
      projectId: 'project-1',
      mimir_signature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA_WEBVIEW.CONFIRM, {
      approvalPageLink: DEFAULT_APPROVAL_PAGE_LINK,
      projectId: 'project-1',
      notificationId: undefined,
      requestId: undefined,
      approvalId: 'approval-1',
      mimirSignature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });

  it('keeps explicit approvalPageLink support for local or alternate hosted approval pages', () => {
    handleCliMfa({
      intent: 'tx_approve',
      approvalPageLink: encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      ),
      notificationId: 'notification-1',
      projectId: 'project-1',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA_WEBVIEW.CONFIRM, {
      approvalPageLink:
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      projectId: 'project-1',
      notificationId: 'notification-1',
      requestId: undefined,
      approvalId: undefined,
      mimirSignature: undefined,
      operationType: 'tx_approve',
      subjectId: undefined,
    });
  });
});
