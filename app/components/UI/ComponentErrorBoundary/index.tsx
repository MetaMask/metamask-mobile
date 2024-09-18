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
  onError?: () => void; //DEVIN_TODO: Determine the exact type for `props.onError`. It's a function, but we need to know its parameters and return type.
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
    // eslint-disable-next-line no-unused-expressions
    this.props.onError?.();

    const { componentLabel, dontTrackAsError } = this.props;

    if (dontTrackAsError) {
      //DEVIN_TODO: Verify the types of parameters and return value for `trackErrorAsAnalytics()` function.
      return trackErrorAsAnalytics(
        `Component Error Boundary: ${componentLabel}`,
        error?.message,
      );
    }
    //DEVIN_TODO: Confirm the return type of `Logger.error()` method.
    Logger.error(error, { View: this.props.componentLabel, ...errorInfo });
  }

  getErrorMessage = (): string =>
    `Component: ${this.props.componentLabel}\n${this.state.error?.toString()}`;

  render(): React.ReactNode {
    return this.state.error ? null : this.props.children;
  }
}

export default ComponentErrorBoundary;
