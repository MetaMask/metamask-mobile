const sanitizeUrl = (url: string) => url.replace(/\/$/, '');

export default sanitizeUrl;
