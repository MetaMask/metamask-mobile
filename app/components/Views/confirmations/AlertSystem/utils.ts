import { ThemeColors } from '@metamask/design-tokens';
import { Severity } from '../types/alerts';

export const getSeverityStyle = (severity: Severity, colors: ThemeColors) => {
    switch (severity) {
      case Severity.Warning:
        return {
          background: colors.warning.muted,
          icon: colors.warning.default,
        };
      case Severity.Danger:
        return {
          background: colors.error.muted,
          icon: colors.error.default,
        };
      default:
        return {
          background: colors.background.default,
          icon: colors.info.default,
        };
    }
  };
