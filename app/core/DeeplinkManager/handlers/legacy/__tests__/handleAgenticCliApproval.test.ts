import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../NavigationService';
import {
  getDefaultApprovalPageLink,
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
      actionPath:
        '?projectId=project-1&approvalId=approval-1&mimir_signature=signature-1&operationType=wallet_mode_change&subjectId=0xabc',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPageLink: getDefaultApprovalPageLink(),
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: 'signature-1',
        operationType: 'wallet_mode_change',
        subjectId: '0xabc',
      },
    );
  });

  it('requires approvalId even when approvalPageLink is present in the deeplink', () => {
    handleAgenticCliApproval({
      actionPath: `?approvalPageLink=${encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      )}&projectId=project-1&notificationId=notification-1&operationType=transaction_request`,
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'handleAgenticCliApproval: missing projectId or notification/request id param',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs and skips navigation when required hosted params are missing', () => {
    handleAgenticCliApproval({
      actionPath: `?approvalPageLink=${encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      )}&projectId=project-1`,
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'handleAgenticCliApproval: missing projectId or notification/request id param',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs and skips navigation when deeplink params are empty', () => {
    handleAgenticCliApproval({ actionPath: '' });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'handleAgenticCliApproval: missing projectId or notification/request id param',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates with the default hosted page when approvalId is present', () => {
    handleAgenticCliApproval({
      actionPath:
        '?approvalPageLink=%&approvalId=approval-1&projectId=project-1',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPageLink: getDefaultApprovalPageLink(),
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: undefined,
        operationType: undefined,
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
      approvalId: 'approval-1',
      mimirSignature: undefined,
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
      approvalId: undefined,
      mimirSignature: undefined,
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
      approvalId: 'approval-1',
      mimirSignature: undefined,
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
      approvalId: 'approval-1',
      mimirSignature: undefined,
      operationType: undefined,
      subjectId: undefined,
    });
  });

  it('forwards supported query params from the deeplink', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?approvalPageLink=https%3A%2F%2Fdeveloper.metamask.io%2Fagentic%2Flogin&projectId=project-1&approvalId=approval-1&mimir_signature=signature-1&operationType=wallet_mode_change&subjectId=0xabc',
      ),
    ).toEqual({
      intent: 'login',
      approvalPageLink: 'https://developer.metamask.io/agentic/login',
      projectId: 'project-1',
      approvalId: 'approval-1',
      mimirSignature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });
});
