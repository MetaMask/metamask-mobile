<<<<<<< HEAD
export const truncateAddress = (address: string | undefined) => {
  if (!address) return '0x';
=======
export const truncateAddress = (address: string | undefined | null) => {
  if (!address || address === null) return null;
>>>>>>> 8ae259608f (feat: card delegation)

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
