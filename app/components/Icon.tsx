import React, { Suspense, lazy } from 'react';

type IconName = 'home' | 'settings' | 'wallet';

const IconMap = {
  home: lazy(() => import('../icons/Home')),
  settings: lazy(() => import('../icons/Settings')),
  wallet: lazy(() => import('../icons/Wallet')),
};

export const Icon: React.FC<{ name: IconName }> = ({ name }) => (
  <Suspense fallback={<span />}>
    {React.createElement(IconMap[name])}
  </Suspense>
);
