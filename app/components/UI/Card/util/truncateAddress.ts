export const truncateAddress = (address: string | undefined) => {
  if (address) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
};
