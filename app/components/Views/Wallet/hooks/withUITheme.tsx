import React from 'react';
import WalletTheme01 from '../themes/01';
import WalletTheme02 from '../themes/02';
import WalletTheme03 from '../themes/03';
export default function withUITheme(theme: string, props) {
  switch (theme) {
    case 'default':
      return <WalletTheme01 {...props} />;
    case 'custom01':
      return <WalletTheme02 {...props} />;
    case 'custom02':
      return <WalletTheme03 {...props} />;
    default:
      return <WalletTheme01 {...props} />;
  }
}
