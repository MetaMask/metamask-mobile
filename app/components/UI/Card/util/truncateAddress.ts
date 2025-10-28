export const truncateAddress = (address: string | undefined) => {
  if (!address) return '0x';

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
