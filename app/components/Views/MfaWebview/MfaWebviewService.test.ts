import { MfaWebviewService, MAX_MESSAGE_LENGTH } from './MfaWebviewService';

describe('MfaWebviewService', () => {
  describe('buildWebViewUrl', () => {
    it('builds the hosted dashboard login URL with the dashboard auth token fragment', () => {
      const url = MfaWebviewService.buildWebViewUrl(
        {
          approvalPageLink: 'https://developer.metamask.io/agentic/login',
          projectId: 'project-1',
          notificationId: 'request-1',
          approvalId: 'approval-1',
          mimirSignature: 'signature-1',
          operationType: 'tx_approve',
          subjectId: 'subject-1',
        },
        'bearer token',
      );

      expect(url).toBe(
        'https://developer.metamask.io/agentic/login?projectId=project-1&notificationId=request-1&approvalId=approval-1&mimir_signature=signature-1&operationType=tx_approve&subjectId=subject-1#auth_token=bearer%20token',
      );
    });

    it('uses requestId as the canonical notificationId compatibility alias', () => {
      const url = MfaWebviewService.buildWebViewUrl(
        {
          approvalPageLink: 'https://developer.metamask.io/agentic/approval',
          projectId: 'project-1',
          requestId: 'request-1',
        },
        'token-1',
      );

      expect(new URL(url).searchParams.get('notificationId')).toBe('request-1');
    });

    it('keeps approvalId-only links compatible with the hosted approval page', () => {
      const url = MfaWebviewService.buildWebViewUrl(
        {
          approvalPageLink: 'https://developer.metamask.io/agentic/approval',
          approvalId: 'approval-1',
          projectId: 'project-1',
          operationType: 'wallet_mode_change',
          subjectId: '0xabc',
        },
        'token-1',
      );
      const parsedUrl = new URL(url);

      expect(parsedUrl.searchParams.get('approvalId')).toBe('approval-1');
      expect(parsedUrl.searchParams.get('projectId')).toBe('project-1');
      expect(parsedUrl.searchParams.get('operationType')).toBe(
        'wallet_mode_change',
      );
      expect(parsedUrl.hash).toBe('#auth_token=token-1');
    });

    it('forwards the Mimir signature using the dashboard query param name', () => {
      const url = MfaWebviewService.buildWebViewUrl(
        {
          approvalPageLink: 'https://test-dashboard.web3auth.io/agentic/login',
          approvalId: 'approval-1',
          projectId: 'project-1',
          mimirSignature: 'sig/with+chars',
        },
        'token-1',
      );

      expect(new URL(url).searchParams.get('mimir_signature')).toBe(
        'sig/with+chars',
      );
    });

    it('keeps the legacy local mock URL shape when no approval page is supplied', () => {
      expect(
        MfaWebviewService.buildWebViewUrl(
          {
            server: 'http://10.0.2.2:3000/',
            sessionId: 'session-1',
          },
          'token-1',
        ),
      ).toBe('http://10.0.2.2:3000/webview/session-1#token=token-1');
    });

    it('rejects hosted approval page URLs from unknown origins', () => {
      expect(() =>
        MfaWebviewService.buildWebViewUrl(
          {
            approvalPageLink: 'https://example.com/approval',
            projectId: 'project-1',
            notificationId: 'request-1',
          },
          'token-1',
        ),
      ).toThrow('Approval page origin is not allowed');
    });
  });

  describe('shouldLoadInWebView', () => {
    it('allows the hosted approval page origin', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView(
          'https://dauh7948dneg6.cloudfront.net/approval',
        ),
      ).toBe(true);
    });

    it('allows the developer-dashboard approval page origin', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView(
          'https://developer.metamask.io/agentic/approval',
        ),
      ).toBe(true);
    });

    it('allows the Web3Auth test dashboard approval page origin', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView(
          'https://test-dashboard.web3auth.io/agentic/approval',
        ),
      ).toBe(true);
    });

    it('allows the Web3Auth auth origin used by the dashboard login flow', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView(
          'https://auth.web3auth.io/auth?state=agentic',
        ),
      ).toBe(true);
    });

    it('allows Stripe controller frames used by the test dashboard', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView(
          'https://js.stripe.com/v3/controller-with-preconnect.html',
        ),
      ).toBe(true);
    });

    it('allows Stripe network telemetry used by the test dashboard', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView(
          'https://m.stripe.network/inner.html',
        ),
      ).toBe(true);
    });

    it('blocks unknown origins', () => {
      expect(
        MfaWebviewService.shouldLoadInWebView('https://example.com/approval'),
      ).toBe(false);
    });
  });

  describe('parseEvent', () => {
    it('parses hosted approval events keyed by approvalId', () => {
      expect(
        MfaWebviewService.parseEvent(
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
        MfaWebviewService.parseEvent(
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

    it('keeps legacy sessionId events compatible with the local mock', () => {
      expect(
        MfaWebviewService.parseEvent(
          JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'rejected',
            sessionId: 'session-1',
          }),
        ),
      ).toEqual({
        source: 'mm-cli-mfa',
        type: 'rejected',
        approvalId: 'session-1',
      });
    });

    it('ignores malformed or untrusted events', () => {
      expect(MfaWebviewService.parseEvent('not-json')).toBeNull();
      expect(
        MfaWebviewService.parseEvent(
          JSON.stringify({
            source: 'other',
            type: 'approved',
            approvalId: 'approval-1',
          }),
        ),
      ).toBeNull();
      expect(
        MfaWebviewService.parseEvent('x'.repeat(MAX_MESSAGE_LENGTH + 1)),
      ).toBeNull();
    });
  });
});
