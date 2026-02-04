import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';

const PERPS_BALANCE_ICON_SVG = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="16" fill="white"/>
  <g clip-path="url(#clip0_13560_8326)">
    <path d="M9.5 21.5C7.96667 21.5 6.66667 20.9667 5.6 19.9C4.53333 18.8333 4 17.5333 4 16C4 14.4667 4.53333 13.1667 5.6 12.1C6.66667 11.0333 7.96667 10.5 9.5 10.5C10.1167 10.5 10.7083 10.6083 11.275 10.825C11.8417 11.0417 12.35 11.35 12.8 11.75L14.5 13.3L13 14.65L11.45 13.25C11.1833 13.0167 10.8833 12.8333 10.55 12.7C10.2167 12.5667 9.86667 12.5 9.5 12.5C8.53333 12.5 7.70833 12.8417 7.025 13.525C6.34167 14.2083 6 15.0333 6 16C6 16.9667 6.34167 17.7917 7.025 18.475C7.70833 19.1583 8.53333 19.5 9.5 19.5C9.86667 19.5 10.2167 19.4333 10.55 19.3C10.8833 19.1667 11.1833 18.9833 11.45 18.75L19.2 11.75C19.65 11.35 20.1583 11.0417 20.725 10.825C21.2917 10.6083 21.8833 10.5 22.5 10.5C24.0333 10.5 25.3333 11.0333 26.4 12.1C27.4667 13.1667 28 14.4667 28 16C28 17.5333 27.4667 18.8333 26.4 19.9C25.3333 20.9667 24.0333 21.5 22.5 21.5C21.8833 21.5 21.2917 21.3917 20.725 21.175C20.1583 20.9583 19.65 20.65 19.2 20.25L17.5 18.7L19 17.35L20.55 18.75C20.8167 18.9833 21.1167 19.1667 21.45 19.3C21.7833 19.4333 22.1333 19.5 22.5 19.5C23.4667 19.5 24.2917 19.1583 24.975 18.475C25.6583 17.7917 26 16.9667 26 16C26 15.0333 25.6583 14.2083 24.975 13.525C24.2917 12.8417 23.4667 12.5 22.5 12.5C22.1333 12.5 21.7833 12.5667 21.45 12.7C21.1167 12.8333 20.8167 13.0167 20.55 13.25L12.8 20.25C12.35 20.65 11.8417 20.9583 11.275 21.175C10.7083 21.3917 10.1167 21.5 9.5 21.5Z" fill="black"/>
  </g>
  <defs>
    <clipPath id="clip0_13560_8326">
      <rect width="24" height="24" fill="white" transform="translate(4 4)"/>
    </clipPath>
  </defs>
</svg>
`;

interface PerpsBalanceIconProps {
  size?: number;
}

/**
 * Icon for the Perps balance option in the Pay With modal and related flows.
 * Renders the link/balance icon (white circle with black path).
 */
export function PerpsBalanceIcon({ size = 40 }: PerpsBalanceIconProps) {
  const xml = useMemo(() => PERPS_BALANCE_ICON_SVG.trim(), []);

  return <SvgXml xml={xml} width={size} height={size} />;
}

export default PerpsBalanceIcon;
