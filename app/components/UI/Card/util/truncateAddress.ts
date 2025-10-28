export const truncateAddress = (address: string | undefined | null) => {
  if (!address || address === null) return null;

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
