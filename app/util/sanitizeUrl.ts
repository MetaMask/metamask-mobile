const sanitizeUrl = (url: string | undefined) => url?.replace(/\/$/, '');

export default sanitizeUrl;

export const compareSanitizedUrl = (urlOne: string, urlTwo: string) =>
  sanitizeUrl(urlOne) === sanitizeUrl(urlTwo);
