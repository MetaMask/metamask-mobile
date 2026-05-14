interface CliAuthWebviewRequest {
  id: string;
  dashboardAccessToken: string;
  dappName: string;
}

interface PendingCliAuthWebviewRequest {
  request: CliAuthWebviewRequest;
  resolve: (authToken: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 2 * 60 * 1000;

const requests = new Map<string, PendingCliAuthWebviewRequest>();

const createRequestId = (): string =>
  `cli-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const takePendingRequest = (
  requestId: string,
): PendingCliAuthWebviewRequest | undefined => {
  const pending = requests.get(requestId);
  if (!pending) return undefined;

  clearTimeout(pending.timeoutId);
  requests.delete(requestId);
  return pending;
};

export const createCliAuthWebviewRequest = ({
  dashboardAccessToken,
  dappName,
}: {
  dashboardAccessToken: string;
  dappName: string;
}): { requestId: string; promise: Promise<string> } => {
  const requestId = createRequestId();

  const promise = new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      takePendingRequest(requestId)?.reject(
        new Error('CLI auth WebView request timed out'),
      );
    }, REQUEST_TIMEOUT_MS);

    requests.set(requestId, {
      request: {
        id: requestId,
        dashboardAccessToken,
        dappName,
      },
      resolve,
      reject,
      timeoutId,
    });
  });

  return { requestId, promise };
};

export const getCliAuthWebviewRequest = (
  requestId: string,
): CliAuthWebviewRequest | undefined => requests.get(requestId)?.request;

export const resolveCliAuthWebviewRequest = (
  requestId: string,
  authToken: string,
): boolean => {
  const pending = takePendingRequest(requestId);
  if (!pending) return false;

  pending.resolve(authToken);
  return true;
};

export const rejectCliAuthWebviewRequest = (
  requestId: string,
  error: Error,
): boolean => {
  const pending = takePendingRequest(requestId);
  if (!pending) return false;

  pending.reject(error);
  return true;
};
