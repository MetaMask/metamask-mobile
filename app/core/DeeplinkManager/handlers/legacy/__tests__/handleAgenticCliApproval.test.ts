import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../NavigationService';
import {
  DEFAULT_APPROVAL_PAGE_LINK,
  handleAgenticCliApproval,
  parseAgenticCliApprovalParams,
} from '../handleAgenticCliApproval';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('handleAgenticCliApproval', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the hosted dashboard login page when agentic-cli deeplink omits approvalPageLink', () => {
    handleAgenticCliApproval({
      intent: 'login',
      approvalId: 'approval-1',
      projectId: 'project-1',
      mimir_signature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPageLink: DEFAULT_APPROVAL_PAGE_LINK,
        projectId: 'project-1',
        notificationId: undefined,
        requestId: undefined,
        approvalId: 'approval-1',
        mimirSignature: 'signature-1',
        operationType: 'wallet_mode_change',
        subjectId: '0xabc',
      },
    );
  });

  it('keeps explicit approvalPageLink support for local or alternate hosted approval pages', () => {
    handleAgenticCliApproval({
      intent: 'tx_approve',
      approvalPageLink: encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      ),
      notificationId: 'notification-1',
      projectId: 'project-1',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPageLink:
          'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
        projectId: 'project-1',
        notificationId: 'notification-1',
        requestId: undefined,
        approvalId: undefined,
        mimirSignature: undefined,
        operationType: 'tx_approve',
        subjectId: undefined,
      },
    );
  });

  it('logs and skips navigation when required hosted params are missing', () => {
    handleAgenticCliApproval({
      intent: 'login',
      approvalPageLink: encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      ),
      projectId: 'project-1',
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'intent=login',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs and skips navigation when there is no hosted approval page', () => {
    handleAgenticCliApproval({ intent: 'login' });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'intent=login',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to the default hosted page when URL decoding fails', () => {
    handleAgenticCliApproval({
      intent: 'login',
      approvalPageLink: '%',
      approvalId: 'approval-1',
      projectId: 'project-1',
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'handleAgenticCliApproval: failed to decode param',
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPageLink: DEFAULT_APPROVAL_PAGE_LINK,
        projectId: 'project-1',
        notificationId: undefined,
        requestId: undefined,
        approvalId: 'approval-1',
        mimirSignature: undefined,
        operationType: 'login',
        subjectId: undefined,
      },
    );
  });
});

describe('parseAgenticCliApprovalParams', () => {
  it('extracts login intent and fields from wallet_mode_change deeplinks', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1&operationType=wallet_mode_change&subjectId=0xabc',
      ),
    ).toEqual({
      intent: 'login',
      approvalPageLink: undefined,
      projectId: 'project-1',
      notificationId: undefined,
      requestId: undefined,
      approvalId: 'approval-1',
      mimir_signature: undefined,
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });

  it('maps transaction_request to tx_approve intent', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&notificationId=request-1&operationType=transaction_request',
      ),
    ).toEqual({
      intent: 'tx_approve',
      approvalPageLink: undefined,
      projectId: 'project-1',
      notificationId: 'request-1',
      requestId: undefined,
      approvalId: undefined,
      mimir_signature: undefined,
      operationType: 'transaction_request',
      subjectId: undefined,
    });
  });

  it('maps tx_approve operationType to tx_approve intent', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1&operationType=tx_approve',
      ),
    ).toEqual({
      intent: 'tx_approve',
      approvalPageLink: undefined,
      projectId: 'project-1',
      notificationId: undefined,
      requestId: undefined,
      approvalId: 'approval-1',
      mimir_signature: undefined,
      operationType: 'tx_approve',
      subjectId: undefined,
    });
  });

  it('defaults to login intent when operationType is missing', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1',
      ),
    ).toEqual({
      intent: 'login',
      approvalPageLink: undefined,
      projectId: 'project-1',
      notificationId: undefined,
      requestId: undefined,
      approvalId: 'approval-1',
      mimir_signature: undefined,
      operationType: undefined,
      subjectId: undefined,
    });
  });

  it('forwards all supported query param aliases', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?approvalPageLink=https%3A%2F%2Fdeveloper.metamask.io%2Fagentic%2Flogin&projectId=project-1&notificationId=notification-1&requestId=request-1&approvalId=approval-1&mimir_signature=signature-1&operationType=wallet_mode_change&subjectId=0xabc',
      ),
    ).toEqual({
      intent: 'login',
      approvalPageLink: 'https://developer.metamask.io/agentic/login',
      projectId: 'project-1',
      notificationId: 'notification-1',
      requestId: 'request-1',
      approvalId: 'approval-1',
      mimir_signature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });
});
