import { useCallback, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import Engine from '../../../core/Engine';

// eslint-disable-next-line import-x/no-restricted-paths
import { UKYC_API_BASE_URL } from '../MoonpayDemo/api';

async function getBearerToken(): Promise<string> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();
  if (!bearerToken) {
    throw new Error(
      'Unable to obtain an authentication bearer token — is the wallet signed in?',
    );
  }
  return bearerToken;
}

interface CreateSessionResponse {
  sessionId: string;
  wrappedUserKey: string;
  idosSessionId: string;
}

async function createSession(
  jwtToken: string,
  moonPayAccessToken: string,
  moonPayUserId: string,
): Promise<CreateSessionResponse> {
  const bearerToken = await getBearerToken();
  const response = await fetch(`${UKYC_API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      vendorId: 'moonpay',
      vendorUserId: 'mockedId',
      jwtToken,
      vendorMetadata: {
        moonPayAccessToken,
        moonPayUserId,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`POST /sessions failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

interface SubmitWrappedKeyResponse {
  status: string;
  applicantAccessToken: string;
}

async function fetchAccessToken(
  sessionId: string,
  wrappedUserKey: string,
  idosSessionId: string,
  jwtToken: string,
): Promise<SubmitWrappedKeyResponse> {
  const bearerToken = await getBearerToken();
  const response = await fetch(
    `${UKYC_API_BASE_URL}/sessions/${sessionId}/wrapped-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ wrappedUserKey, jwtToken, idosSessionId }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /sessions/${sessionId}/wrapped-key failed (${response.status}): ${errorBody}`,
    );
  }

  return await response.json();
}

const useSumSubDemo = () => {
  const [sdkResult, setSdkResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const launchSumSubSDK = useCallback(
    async (moonPayAccessToken: string | null, moonPayUserId: string | null) => {
      setIsLoading(true);
      setSdkResult(null);
      setStatus(null);

      try {
        if (!NativeModules.SNSMobileSDKModule) {
          throw new Error(
            'SumSub native module is not available. Rebuild the app with native dependencies (yarn start:ios or yarn start:android). Expo Go is not supported.',
          );
        }

        setStatus('Creating UKYC session...');
        const mockJwtToken = 'mock-jwt-token';
        if (!moonPayAccessToken) {
          throw new Error('MoonPay access token not provided');
        }
        if (!moonPayUserId) {
          throw new Error('Auth customer ID not provided');
        }
        const { sessionId, idosSessionId, wrappedUserKey } =
          await createSession(mockJwtToken, moonPayAccessToken, moonPayUserId);

        setStatus('Fetching access token...');
        const { applicantAccessToken } = await fetchAccessToken(
          sessionId,
          wrappedUserKey,
          idosSessionId,
          mockJwtToken,
        );

        setStatus('Launching SumSub SDK...');
        const snsMobileSDK = SNSMobileSDK.init(
          applicantAccessToken,
          async () => {
            const { applicantAccessToken: refreshedAccessToken } =
              await fetchAccessToken(
                sessionId,
                wrappedUserKey,
                idosSessionId,
                mockJwtToken,
              );
            return refreshedAccessToken;
          },
        )
          .withHandlers({
            onStatusChanged: (event: {
              prevStatus: string;
              newStatus: string;
            }) => {
              // eslint-disable-next-line no-console
              console.log(
                `[SumSub] Status: ${event.prevStatus} => ${event.newStatus}`,
              );
            },
            onLog: (event: { message: string }) => {
              // eslint-disable-next-line no-console
              console.log(`[SumSub] ${event.message}`);
            },
          })
          .withDebug(true)
          .withLocale('en')
          .build();

        const result: Record<string, unknown> = await snsMobileSDK.launch();
        // eslint-disable-next-line no-console
        console.log('[SumSub] Result:', JSON.stringify(result));
        setSdkResult(result);
        setStatus('Complete');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SumSubDemo] Error:', err);
        setSdkResult({ error: String(err) });
        setStatus('Failed');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { sdkResult, isLoading, status, launchSumSubSDK };
};

export default useSumSubDemo;
