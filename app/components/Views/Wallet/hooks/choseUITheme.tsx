/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
<<<<<<<< HEAD:app/components/Views/Wallet/hooks/withUITheme.tsx
export default function withUITheme(theme: string) {
========
export default function choseUITheme(theme: string) {
>>>>>>>> cd49389e2 (chore: various polishings):app/components/Views/Wallet/hooks/choseUITheme.tsx
  switch (theme) {
    case 'default':
      return require('../themes/01').default;
    case 'custom01':
      return require('../themes/02').default;
    case 'custom02':
      return require('../themes/03').default;
    default:
      return require('../themes/01').default;
  }
}
