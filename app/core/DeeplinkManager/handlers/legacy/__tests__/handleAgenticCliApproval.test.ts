import Routes from '../../../../../constants/navigation/Routes';
import { DEFAULT_APPROVAL_PAGE_PATH } from '../../../../../components/Views/AgenticCliApproval/AgenticCliApprovalService';
import { getBuildType } from '../../../../../core/OAuthService/OAuthLoginHandlers/constants';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../NavigationService';
import {
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

jest.mock(
  '../../../../../core/OAuthService/OAuthLoginHandlers/constants',
  () => ({
    getBuildType: jest.fn(),
  }),
);

const mockGetBuildType = getBuildType as jest.MockedFunction<
  typeof getBuildType
>;

describe('handleAgenticCliApproval', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetBuildType.mockReturnValue('development');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the default approval path when agentic-cli deeplink omits approvalPagePath', () => {
    handleAgenticCliApproval({
      actionPath:
        '?projectId=project-1&approvalId=approval-1&mimirSignature=signature-1&operationType=wallet_mode_change&subjectId=0xabc',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPagePath: DEFAULT_APPROVAL_PAGE_PATH,
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: 'signature-1',
        operationType: 'wallet_mode_change',
        subjectId: '0xabc',
      },
    );
  });

  it('forwards approvalPagePath from the deeplink when valid', () => {
    handleAgenticCliApproval({
      actionPath:
        '?approvalPagePath=%2Fagentic%2Fapproval&projectId=project-1&approvalId=approval-1&operationType=transaction_request',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPagePath: '/agentic/approval',
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: undefined,
        operationType: 'transaction_request',
        subjectId: undefined,
      },
    );
  });

  it('falls back to the default path when approvalPagePath is invalid', () => {
    handleAgenticCliApproval({
      actionPath: `?approvalPagePath=${encodeURIComponent(
        'https://evil.com/agentic/approval',
      )}&projectId=project-1&approvalId=approval-1`,
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      expect.objectContaining({
        approvalPagePath: DEFAULT_APPROVAL_PAGE_PATH,
      }),
    );
  });

  it('logs and skips navigation when approvalId is missing', () => {
    handleAgenticCliApproval({
      actionPath:
        '?approvalPagePath=%2Fagentic%2Fapproval&projectId=project-1&notificationId=notification-1&operationType=transaction_request',
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'handleAgenticCliApproval: missing projectId or approvalId param',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs and skips navigation when required hosted params are missing', () => {
    handleAgenticCliApproval({
      actionPath: '?approvalPagePath=%2Fagentic%2Fapproval&projectId=project-1',
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'handleAgenticCliApproval: missing projectId or approvalId param',
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
          'handleAgenticCliApproval: missing projectId or approvalId param',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates with the default path when approvalId is present', () => {
    handleAgenticCliApproval({
      actionPath:
        '?approvalPagePath=%&approvalId=approval-1&projectId=project-1',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPagePath: DEFAULT_APPROVAL_PAGE_PATH,
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: undefined,
        operationType: undefined,
        subjectId: undefined,
      },
    );
  });

  it('navigates with undefined mimirSignature when mimirSignature fails to decode', () => {
    handleAgenticCliApproval({
      actionPath: '?projectId=project-1&approvalId=approval-1&mimirSignature=%',
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'AgenticCliApprovalService: failed to decode deeplink param',
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPagePath: DEFAULT_APPROVAL_PAGE_PATH,
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: undefined,
        operationType: undefined,
        subjectId: undefined,
      },
    );
  });

  it('preserves literal plus signs in mimirSignature when navigating', () => {
    handleAgenticCliApproval({
      actionPath:
        '?projectId=project-1&approvalId=approval-1&mimirSignature=abc+def/ghi=',
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      expect.objectContaining({
        mimirSignature: 'abc+def/ghi=',
      }),
    );
  });
});

describe('parseAgenticCliApprovalParams', () => {
  it('parses wallet_mode_change deeplink fields', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1&operationType=wallet_mode_change&subjectId=0xabc',
      ),
    ).toEqual({
      approvalPagePath: undefined,
      projectId: 'project-1',
      approvalId: 'approval-1',
      mimirSignature: undefined,
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });

  it('parses transaction_request without approvalId', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&notificationId=request-1&operationType=transaction_request',
      ),
    ).toEqual({
      approvalPagePath: undefined,
      projectId: 'project-1',
      approvalId: undefined,
      mimirSignature: undefined,
      operationType: 'transaction_request',
      subjectId: undefined,
    });
  });

  it('parses tx_approve operationType with approvalId', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1&operationType=tx_approve',
      ),
    ).toEqual({
      approvalPagePath: undefined,
      projectId: 'project-1',
      approvalId: 'approval-1',
      mimirSignature: undefined,
      operationType: 'tx_approve',
      subjectId: undefined,
    });
  });

  it('parses deeplink fields when operationType is missing', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1',
      ),
    ).toEqual({
      approvalPagePath: undefined,
      projectId: 'project-1',
      approvalId: 'approval-1',
      mimirSignature: undefined,
      operationType: undefined,
      subjectId: undefined,
    });
  });

  it('forwards approvalPagePath from the deeplink', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?approvalPagePath=%2Fagentic%2Flogin&projectId=project-1&approvalId=approval-1&mimirSignature=signature-1&operationType=wallet_mode_change&subjectId=0xabc',
      ),
    ).toEqual({
      approvalPagePath: '/agentic/login',
      projectId: 'project-1',
      approvalId: 'approval-1',
      mimirSignature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });
});
