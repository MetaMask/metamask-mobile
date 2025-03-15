import React from 'react';
import Logger from '../../../util/Logger';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';

interface ComponentErrorBoundaryProps {
  /**
   * Component to be used when there is no error
   */
  children: React.ReactNode;
  /**
   * Component label for logging
   */
  componentLabel: string;
  /**
   * Function to be called when there is an error
   */
  onError?: () => void;
  /**
   * Will not track as an error, but still log to analytics
   */
  dontTrackAsError?: boolean;
}

interface ComponentErrorBoundaryState {
  error: Error | null;
}

class ComponentErrorBoundary extends React.Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
  state: ComponentErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.();

    const { componentLabel, dontTrackAsError } = this.props;

    if (dontTrackAsError) {
      trackErrorAsAnalytics(
        `Component Error Boundary: ${componentLabel}`,
        error?.message,
      );
      return;
    }
    Logger.error(error, { View: this.props.componentLabel, ...errorInfo });
  }

  getErrorMessage = (): string =>
    `Component: ${this.props.componentLabel}\n${this.state.error?.toString()}`;

  render(): React.ReactNode {
    return this.state.error ? null : this.props.children;
  }
}

export default ComponentErrorBoundary;
