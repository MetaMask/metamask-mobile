/**
 * Default responses for common API patterns
 * These provide meaningful defaults instead of generic 200s
 */
interface DefaultResponse {
  urlEndpoint: string;
  response: Record<string, unknown>;
  responseCode: number;
}

export const DEFAULT_RESPONSES: DefaultResponse[] = [
  {
    urlEndpoint: 'https://metametrics.test/track',
    response: { success: true },
    responseCode: 200,
  },
];

/**
 * Get default response for a URL
 */
export const getDefaultResponse = (url: string): DefaultResponse | null =>
  DEFAULT_RESPONSES.find(response => response.urlEndpoint === url) || null;
