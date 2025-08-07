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
  errorContainer: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  errorTitle: {
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  errorMessage: {
    textAlign: 'center' as const,
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  retryButton: {
    minWidth: 200,
  },
});
