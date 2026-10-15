export const MONEY_AUTHENTICATOR_SETUP_KEY = 'AABB CCDD EEFF GGGH WEJE 2321';

export const MONEY_AUTHENTICATOR_SETUP_KEY_COMPACT =
  MONEY_AUTHENTICATOR_SETUP_KEY.replace(/\s/g, '');

export const MONEY_AUTHENTICATOR_TOTP_URI = `otpauth://totp/MetaMask%20Money:wallet?secret=${MONEY_AUTHENTICATOR_SETUP_KEY_COMPACT}&issuer=MetaMask%20Money&digits=6&period=30`;
