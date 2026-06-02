import type {
  ConnectionRequest,
  isConnectionRequest,
} from '../SDKConnectV2/types/connection-request';

export interface AgenticCliConnectionType {
  name: 'agentic-cli';
  dashboardUrl?: string;
  dashboardAuthUrl?: string;
}

export interface AgenticCliConnectionRequest extends ConnectionRequest {
  connectionType: AgenticCliConnectionType;
}

const isOptionalHttpUrl = (url: unknown): boolean => {
  if (url === undefined) {
    return true;
  }
  if (typeof url !== 'string' || url.length > 1024) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidConnectionType = (
  connectionType: unknown,
): connectionType is AgenticCliConnectionType => {
  if (
    !connectionType ||
    typeof connectionType !== 'object' ||
    Array.isArray(connectionType)
  ) {
    return false;
  }

  const typed = connectionType as AgenticCliConnectionType;
  return (
    typed.name === 'agentic-cli' &&
    isOptionalHttpUrl(typed.dashboardUrl) &&
    isOptionalHttpUrl(typed.dashboardAuthUrl)
  );
};

export const isAgenticCliConnectionRequest = (
  data: unknown,
): data is AgenticCliConnectionRequest => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const obj = data as AgenticCliConnectionRequest;
  if (!isValidConnectionType(obj.connectionType)) {
    return false;
  }

  const { connectionType: _connectionType, ...base } = obj;
  return isConnectionRequest(base);
};

export const isAgenticCliConnectionRequestType = (
  connReq: ConnectionRequest,
): connReq is AgenticCliConnectionRequest =>
  isAgenticCliConnectionRequest(connReq);
