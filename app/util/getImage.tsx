import PopularList from './networks/customNetworks';

const getImage = (chainId: string) => {
  const customNetworkData = PopularList.filter(
    (x: { chainId: string }) => x.chainId === chainId,
  );
  const image =
    customNetworkData.length > 0
      ? customNetworkData[0].rpcPrefs.imageUrl
      : null;
  return image;
};

export default getImage;
