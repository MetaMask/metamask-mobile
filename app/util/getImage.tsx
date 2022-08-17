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

//This function will be removed when the rinkeby, kovan and ropsten from the popular networks list
export const getColor = (chainId: string) => {
  const customNetworkData = PopularList.filter(
    (x: { chainId: string }) => x.chainId === chainId,
  );
  const color =
    customNetworkData.length > 0 ? customNetworkData[0].color : null;
  return color;
};

export default getImage;
