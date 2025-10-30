export const truncateAddress = (
  address: string | undefined,
  chars: number = 4,
) => {
  if (address) {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }
};
