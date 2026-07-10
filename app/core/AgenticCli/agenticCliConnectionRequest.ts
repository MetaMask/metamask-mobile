import {
  isConnectionRequest,
  type ConnectionRequest,
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

export const isAgenticCliConnectionRequest = (
  data: unknown,
): data is AgenticCliConnectionRequest => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const obj = data as AgenticCliConnectionRequest;
  const connectionType = obj.connectionType;

  if (
    !connectionType ||
    typeof connectionType !== 'object' ||
    Array.isArray(connectionType)
  ) {
    return false;
  }

  if (connectionType.name !== 'agentic-cli') {
    return false;
  }

  if (
    !isOptionalHttpUrl(connectionType.dashboardUrl) ||
    !isOptionalHttpUrl(connectionType.dashboardAuthUrl)
  ) {
    return false;
  }

  const { connectionType: _connectionType, ...base } = obj;
  return isConnectionRequest(base);
};
