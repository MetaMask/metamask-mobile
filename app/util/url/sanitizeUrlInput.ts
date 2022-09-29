const sanitizeUrlInput = (url: string) =>
  url.replace(/'/g, '%27').replace(/[\r\n]/g, '');

export default sanitizeUrlInput;
