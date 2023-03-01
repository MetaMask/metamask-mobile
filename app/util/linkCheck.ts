export const isLinkSafe = (link: string): boolean => {
  try {
    const url = new URL(link);
    // eslint-disable-next-line no-script-url
    if (url.protocol === 'javascript:') {
      return false;
    }
  } catch (err) {
    return false;
  }
  return true;
};

export default isLinkSafe;
