// URL is set at build time via builds.yml, fallback for local dev
const DEFAULT_BAANX_API_URL = 'https://dev.api.baanx.com';

export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  _metaMaskEnv: string | undefined,
) =>
  // Environment-specific URL is now set at build time via builds.yml
  process.env.BAANX_API_URL || DEFAULT_BAANX_API_URL;
