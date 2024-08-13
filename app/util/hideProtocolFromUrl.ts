const hideProtocolFromUrl = (url: string | undefined) => {
  if (!url) return url;

  try {
    // Use the URL constructor to parse the URL
    const parsedUrl = new URL(url);

    // If the pathname is just '/', exclude it from the result
    const pathname = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname;

    // Return the URL without the protocol
    return parsedUrl.host + pathname + parsedUrl.search + parsedUrl.hash;
  } catch (error) {
    // If the URL constructor throws an error, return the original URL
    // This might happen if the input is not a valid URL
    return url;
  }
};

export default hideProtocolFromUrl;
