const getIsRedesignedStablecoinLendingScreenEnabled = () =>
  process.env.MM_STABLECOIN_LENDING_UI_ENABLED_REDESIGNED === 'true';

export { getIsRedesignedStablecoinLendingScreenEnabled };
