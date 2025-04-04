const stripProtocol = (url: string | undefined) => {
  if (!url) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.host}${
      parsedUrl.pathname === '/' ? '' : parsedUrl.pathname
    }`;
  } catch (error) {
    return url;
  }
};

export default stripProtocol;
