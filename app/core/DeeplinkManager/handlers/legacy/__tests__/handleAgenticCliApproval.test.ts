import Routes from '../../../../../constants/navigation/Routes';
import { getBuildType } from '../../../../../core/OAuthService/OAuthLoginHandlers/constants';
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

jest.mock(
  '../../../../../core/OAuthService/OAuthLoginHandlers/constants',
  () => ({
    getBuildType: jest.fn(),
  }),
);

const mockGetBuildType = getBuildType as jest.MockedFunction<
  typeof getBuildType
>;

describe('getDefaultApprovalPageLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the test dashboard login URL for development builds', () => {
    mockGetBuildType.mockReturnValue('development');

    expect(getDefaultApprovalPageLink()).toBe(
      'https://test-dashboard.web3auth.io/agentic/login',
    );
  });

  it('returns the dev dashboard login URL for UAT builds', () => {
    mockGetBuildType.mockReturnValue('main_uat');

    expect(getDefaultApprovalPageLink()).toBe(
      'https://dev-dashboard.web3auth.io/agentic/login',
    );
  });

  it('returns the developer dashboard login URL for production builds', () => {
    mockGetBuildType.mockReturnValue('main_prod');

    expect(getDefaultApprovalPageLink()).toBe(
      'https://developer.metamask.io/agentic/login',
    );
  });

  it('returns the test dashboard login URL for dev channel builds', () => {
    mockGetBuildType.mockReturnValue('main_dev');

    expect(getDefaultApprovalPageLink()).toBe(
      'https://test-dashboard.web3auth.io/agentic/login',
    );
  });
});

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

  it('ignores deeplink approvalPageLink and navigates with the default hosted page', () => {
    const customApprovalPageLink =
      'https://agentic-mimir-service.dev-api.cx.metamask.io/approval';

    handleAgenticCliApproval({
      actionPath: `?approvalPageLink=${encodeURIComponent(
        customApprovalPageLink,
      )}&projectId=project-1&approvalId=approval-1&operationType=transaction_request`,
    });

    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      {
        approvalPageLink: getDefaultApprovalPageLink(),
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: undefined,
        operationType: 'transaction_request',
        subjectId: undefined,
      },
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.AGENTIC_CLI_APPROVAL.CONFIRM,
      expect.objectContaining({
        approvalPageLink: customApprovalPageLink,
      }),
    );
  });

  it('logs and skips navigation when approvalId is missing', () => {
    handleAgenticCliApproval({
      actionPath: `?approvalPageLink=${encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      )}&projectId=project-1&notificationId=notification-1&operationType=transaction_request`,
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
      actionPath: `?approvalPageLink=${encodeURIComponent(
        'https://agentic-mimir-service.dev-api.cx.metamask.io/approval',
      )}&projectId=project-1`,
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

  it('navigates with undefined mimirSignature when mimir_signature fails to decode', () => {
    handleAgenticCliApproval({
      actionPath:
        '?projectId=project-1&approvalId=approval-1&mimir_signature=%',
    });

    jest.advanceTimersByTime(200);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'handleAgenticCliApproval: failed to decode param',
    );
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
  it('parses wallet_mode_change deeplink fields', () => {
    expect(
      parseAgenticCliApprovalParams(
        '?projectId=project-1&approvalId=approval-1&operationType=wallet_mode_change&subjectId=0xabc',
      ),
    ).toEqual({
      approvalPageLink: undefined,
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
      approvalPageLink: undefined,
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
      approvalPageLink: undefined,
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
      approvalPageLink: 'https://developer.metamask.io/agentic/login',
      projectId: 'project-1',
      approvalId: 'approval-1',
      mimirSignature: 'signature-1',
      operationType: 'wallet_mode_change',
      subjectId: '0xabc',
    });
  });
});
