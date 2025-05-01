// Temp: Contract addresses below will be replaced by earn-sdk/earn-controller in the next iteration.
const USDC_BASE_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_MAINNET_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI_MAINNET_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// TODO: Replace hardcoded token addresses with calls to TokenController
// Temp: Contract map will be replaced by earn-sdk/earn-contorller in the next iteration.
export const STABLECOIN_TOKEN_CONTRACT_ADDRESS_MAP = {
  '0x1': {
    DAI: DAI_MAINNET_TOKEN_ADDRESS,
    USDC: USDC_MAINNET_TOKEN_ADDRESS,
  },
  '0x2105': {
    USDC: USDC_BASE_TOKEN_ADDRESS,
  },
};

export const AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
