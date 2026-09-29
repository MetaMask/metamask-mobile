import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * Tailwind-derived styles for the Profile Drawer screen, exposed as a hook so
 * classes resolve through the MetaMask design-system preset (theme-aware).
 *
 * Note: new screens use `useTailwind()` + design-system primitives instead of
 * `StyleSheet.create()` per the UI guidelines; this file keeps the styling
 * colocated and reusable for `ProfileDrawer.tsx`.
 */
export const useProfileDrawerStyles = () => {
  const tw = useTailwind();

  return {
    screen: tw.style('flex-1 bg-default'),
    content: tw.style('flex-1'),
    profileSection: tw.style('items-center pt-6 pb-8'),
    /**
     * Circular avatar-shape placeholder. Uses a muted fill so the "+" icon
     * reads as an affordance without implying an existing identity.
     */
    avatarPlaceholder: tw.style(
      'h-20 w-20 items-center justify-center rounded-full bg-muted',
    ),
    createProfileLabel: tw.style('mt-3'),
    rowsSection: tw.style('flex-1'),
  };
};
