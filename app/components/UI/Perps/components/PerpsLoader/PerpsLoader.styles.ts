import type { Theme } from '../../../../../util/theme/models';

export const createStyles = ({
  theme: _theme,
}: {
  theme: Theme;
  vars: Record<string, never>;
}) => ({
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
  },
  inlineContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 12,
    textAlign: 'center' as const,
  },
  spinner: {
    // Using theme colors for spinner
  },
});
