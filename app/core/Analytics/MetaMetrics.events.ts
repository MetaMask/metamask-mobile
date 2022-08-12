const generateOpt = (name: string, anonymous?: boolean) => ({
  category: name,
  anonymous: anonymous || false,
});

const MetaMetricsEvents = {
  WALLET: {
    OPEN: generateOpt('Wallet Opened'),
    TOKEN_ADDED: generateOpt('Token Added'),
    COLLECTIBLE_ADDED: generateOpt('Collectible Added'),
  },
};

export default MetaMetricsEvents;
