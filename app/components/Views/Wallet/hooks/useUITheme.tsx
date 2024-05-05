/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
export default function useUITheme(theme: string) {
  switch (theme) {
    case 'default':
      return require('../themes/01').default;
    case 'custom01':
      return require('../themes/02').default;
    default:
      return require('../themes/01').default;
  }
}
