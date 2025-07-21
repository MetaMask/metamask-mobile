/**
 * Default responses for common API patterns
 * These provide meaningful defaults instead of generic 200s
 */
interface DefaultResponse {
  statusCode: number;
  body: string;
}

interface HostDefaults {
  [path: string]: DefaultResponse;
}

interface DefaultResponses {
  [host: string]: HostDefaults;
}

export const DEFAULT_RESPONSES: DefaultResponses = {
  'metametrics.test': {
    '/track': {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    },
  },
};

/**
 * Get default response for a host and path
 */
export const getDefaultResponse = (host: string, path: string) => {
  const hostDefaults = DEFAULT_RESPONSES[host];
  if (!hostDefaults) return null;

  // Try exact path match first
  if (hostDefaults[path]) {
    return hostDefaults[path];
  }

  // Fall back to default for host
  return hostDefaults.default || null;
};
