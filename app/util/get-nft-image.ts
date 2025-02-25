type NFTImage = string | string[] | undefined | null;
export const getNftImage = (image: NFTImage): string | undefined => {
  if (typeof image === 'string') {
    return image;
  }

  if (Array.isArray(image)) {
    return image[0];
  }

  return undefined;
};
