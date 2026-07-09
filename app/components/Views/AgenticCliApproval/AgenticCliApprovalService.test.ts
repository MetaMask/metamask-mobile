import { getBuildType } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import Logger from '../../../util/Logger';
import {
  AgenticCliApprovalService,
  DEFAULT_APPROVAL_PAGE_PATH,
  getApprovalHost,
  MAX_MESSAGE_LENGTH,
  resolveApprovalPageUrl,
  validateApprovalPagePath,
} from './AgenticCliApprovalService';

jest.mock('../../../core/OAuthService/OAuthLoginHandlers/constants', () => ({
  getBuildType: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetBuildType = getBuildType as jest.MockedFunction<
  typeof getBuildType
>;

describe('AgenticCliApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBuildType.mockReturnValue('main_prod');
  });

  describe('getApprovalHost', () => {
    it('returns the develop developer dashboard host for development builds', () => {
      mockGetBuildType.mockReturnValue('development');

      expect(getApprovalHost()).toBe('https://develop-developer.metamask.io');
    });

    it('returns the staging developer dashboard host for UAT builds', () => {
      mockGetBuildType.mockReturnValue('main_uat');

      expect(getApprovalHost()).toBe('https://staging-developer.metamask.io');
    });

    it('returns the developer dashboard host for production builds', () => {
      mockGetBuildType.mockReturnValue('main_prod');

      expect(getApprovalHost()).toBe('https://developer.metamask.io');
    });

    it('returns the develop developer dashboard host for dev channel builds', () => {
      mockGetBuildType.mockReturnValue('main_dev');

      expect(getApprovalHost()).toBe('https://develop-developer.metamask.io');
    });
  });

  describe('validateApprovalPagePath', () => {
    it('returns the default path when omitted', () => {
      expect(validateApprovalPagePath()).toBe(DEFAULT_APPROVAL_PAGE_PATH);
      expect(validateApprovalPagePath('')).toBe(DEFAULT_APPROVAL_PAGE_PATH);
    });

    it('accepts allowed agentic paths', () => {
      expect(validateApprovalPagePath('/agentic/approval')).toBe(
        '/agentic/approval',
      );
    });

    it('falls back to default for unsafe paths', () => {
      expect(validateApprovalPagePath('https://evil.com/agentic/login')).toBe(
        DEFAULT_APPROVAL_PAGE_PATH,
      );
      expect(validateApprovalPagePath('//evil/agentic/login')).toBe(
        DEFAULT_APPROVAL_PAGE_PATH,
      );
      expect(validateApprovalPagePath('../agentic/login')).toBe(
        DEFAULT_APPROVAL_PAGE_PATH,
      );
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('resolveApprovalPageUrl', () => {
    it('combines mobile host with the validated path', () => {
      mockGetBuildType.mockReturnValue('main_prod');

      expect(resolveApprovalPageUrl('/agentic/approval').toString()).toBe(
        'https://developer.metamask.io/agentic/approval',
      );
    });
  });

  describe('parseDeeplinkQuery', () => {
    it('parses approvalPagePath and other query params', () => {
      expect(
        AgenticCliApprovalService.parseDeeplinkQuery(
          '?approvalPagePath=%2Fagentic%2Fapproval&projectId=project-1&approvalId=approval-1&mimirSignature=signature-1&operationType=wallet_mode_change&subjectId=0xabc',
        ),
      ).toEqual({
        approvalPagePath: '/agentic/approval',
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: 'signature-1',
        operationType: 'wallet_mode_change',
        subjectId: '0xabc',
      });
    });

    it('preserves literal plus signs in mimirSignature', () => {
      expect(
        AgenticCliApprovalService.parseDeeplinkQuery(
          '?projectId=project-1&approvalId=approval-1&mimirSignature=abc+def/ghi=',
        ).mimirSignature,
      ).toBe('abc+def/ghi=');
    });

    it('still decodes percent-encoded mimirSignature values', () => {
      expect(
        AgenticCliApprovalService.decodeDeeplinkParam(
          AgenticCliApprovalService.parseDeeplinkQuery(
            '?projectId=project-1&approvalId=approval-1&mimirSignature=sig%2Fwith%2Bchars',
          ).mimirSignature,
        ),
      ).toBe('sig/with+chars');
    });
  });

  describe('buildWebViewUrl', () => {
    it('builds the hosted approval URL with forwarded query params', () => {
      const url = AgenticCliApprovalService.buildWebViewUrl({
        approvalPagePath: '/agentic/approval',
        projectId: 'project-1',
        approvalId: 'approval-1',
        mimirSignature: 'signature-1',
        operationType: 'transaction_request',
        subjectId: 'subject-1',
      });

      expect(url).toBe(
        'https://developer.metamask.io/agentic/approval?projectId=project-1&approvalId=approval-1&mimirSignature=signature-1&operationType=transaction_request&subjectId=subject-1',
      );
      expect(new URL(url).hash).toBe('');
    });

    it('uses the default approval path when approvalPagePath is omitted', () => {
      const url = AgenticCliApprovalService.buildWebViewUrl({
        projectId: 'project-1',
        approvalId: 'approval-1',
      });

      expect(new URL(url).pathname).toBe('/agentic/approval');
    });

    it('forwards approvalId to the hosted approval page query string', () => {
      const url = AgenticCliApprovalService.buildWebViewUrl({
        approvalPagePath: '/agentic/approval',
        projectId: 'project-1',
        approvalId: 'approval-1',
      });

      expect(new URL(url).searchParams.get('approvalId')).toBe('approval-1');
    });

    it('forwards the Mimir signature using the dashboard query param name', () => {
      mockGetBuildType.mockReturnValue('development');

      const url = AgenticCliApprovalService.buildWebViewUrl({
        approvalPagePath: '/agentic/approval',
        approvalId: 'approval-1',
        projectId: 'project-1',
        mimirSignature: 'sig/with+chars',
      });

      expect(new URL(url).searchParams.get('mimirSignature')).toBe(
        'sig/with+chars',
      );
      expect(new URL(url).host).toBe('develop-developer.metamask.io');
    });
  });

  describe('shouldLoadInWebView', () => {
    it('blocks unknown cloudfront origins until explicitly allowlisted', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://dauh7948dneg6.cloudfront.net/approval',
        ),
      ).toBe(false);
    });

    it('allows the developer-dashboard approval page origin', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://developer.metamask.io/agentic/approval',
        ),
      ).toBe(true);
    });

    it('allows the Web3Auth test dashboard approval page origin', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://test-dashboard.web3auth.io/agentic/approval',
        ),
      ).toBe(true);
    });

    it('allows the Web3Auth dev dashboard approval page origin', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://dev-dashboard.web3auth.io/agentic/login',
        ),
      ).toBe(true);
    });

    it('allows the Web3Auth auth origin used by the dashboard login flow', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://auth.web3auth.io/auth?state=agentic',
        ),
      ).toBe(true);
    });

    it('allows Stripe controller frames used by the test dashboard', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://js.stripe.com/v3/controller-with-preconnect.html',
        ),
      ).toBe(true);
    });

    it('allows Stripe network telemetry used by the test dashboard', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://m.stripe.network/inner.html',
        ),
      ).toBe(true);
    });

    it('blocks unknown origins', () => {
      expect(
        AgenticCliApprovalService.shouldLoadInWebView(
          'https://example.com/approval',
        ),
      ).toBe(false);
    });
  });

  describe('parseEvent', () => {
    it('parses hosted approval events keyed by approvalId', () => {
      expect(
        AgenticCliApprovalService.parseEvent(
          JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'approved',
            approvalId: 'approval-1',
          }),
        ),
      ).toEqual({
        source: 'mm-cli-mfa',
        type: 'approved',
        approvalId: 'approval-1',
      });
    });

    it('parses hosted approval error events', () => {
      expect(
        AgenticCliApprovalService.parseEvent(
          JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'error',
            approvalId: 'approval-1',
            message: 'failed',
          }),
        ),
      ).toEqual({
        source: 'mm-cli-mfa',
        type: 'error',
        approvalId: 'approval-1',
        message: 'failed',
      });
    });

    it('ignores malformed or untrusted events', () => {
      expect(AgenticCliApprovalService.parseEvent('not-json')).toBeNull();
      expect(
        AgenticCliApprovalService.parseEvent(
          JSON.stringify({
            source: 'other',
            type: 'approved',
            approvalId: 'approval-1',
          }),
        ),
      ).toBeNull();
      expect(
        AgenticCliApprovalService.parseEvent(
          'x'.repeat(MAX_MESSAGE_LENGTH + 1),
        ),
      ).toBeNull();
    });
  });
});
