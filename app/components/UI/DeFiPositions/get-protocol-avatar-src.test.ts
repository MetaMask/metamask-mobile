import {
  getProtocolAvatarSrc,
  METAMASK_DEFI_PROTOCOL_ID,
} from './get-protocol-avatar-src';
import metamaskFoxLogo from '../../../images/branding/fox.png';

const OLD_METAMASK_ICON_URL =
  'https://raw.githubusercontent.com/MetaMask/metamask-extension/master/app/images/logo/metamask-fox-bg.svg';

describe('getProtocolAvatarSrc', () => {
  it('returns the bundled MetaMask logo for the MetaMask protocol', () => {
    const result = getProtocolAvatarSrc(
      OLD_METAMASK_ICON_URL,
      METAMASK_DEFI_PROTOCOL_ID,
    );

    expect(result).toBe(metamaskFoxLogo);
  });

  it('returns the API icon URL for other protocols', () => {
    const iconUrl = 'https://example.com/aave.png';

    const result = getProtocolAvatarSrc(iconUrl, 'aave-v3');

    expect(result).toStrictEqual({ uri: iconUrl });
  });

  it('returns the API icon URL when no protocol id is given', () => {
    const result = getProtocolAvatarSrc(OLD_METAMASK_ICON_URL);

    expect(result).toStrictEqual({ uri: OLD_METAMASK_ICON_URL });
  });
});
