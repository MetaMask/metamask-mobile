const sanitizeUrl = (url: string | undefined) => url?.replace(/\/$/, '');

export default sanitizeUrl;
