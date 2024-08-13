const hideProtocolFromUrl = (url: string | undefined) => {
  if (!url) return url;

  // This regex matches the protocol at the start of the URL (http or https)
  const regex = /^(https?:\/\/)(.*)$/;
  const match = url.match(regex);

  if (match) {
    // Instead of returning the protocol and the rest of the URL,
    // we just return the rest of the URL, effectively hiding the protocol.
    return match[2];
  }

  // If the URL doesn't match the expected format (though unlikely for valid URLs),
  // return it as is.
  return url;
};

export default hideProtocolFromUrl;
