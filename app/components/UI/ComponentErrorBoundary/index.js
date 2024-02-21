import React from 'react';
import PropTypes from 'prop-types';
import Logger from '../../../util/Logger';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';

class ComponentErrorBoundary extends React.Component {
  state = { error: null };

  static propTypes = {
    /**
     * Component to be used when there is no error
     */
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
    ]),
    /**
     * Component label for logging
     */
    componentLabel: PropTypes.string.isRequired,
    /**
     * Function to be called when there is an error
     */
    onError: PropTypes.func,
    /**
     * Will not track as an error, but still log to analytics
     */
    dontTrackAsError: PropTypes.bool,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-unused-expressions
    this.props.onError?.();

    const { componentLabel, dontTrackAsError } = this.props;

    if (dontTrackAsError) {
      return this.props.metrics.trackEvent(
        `Component Error Boundary: ${componentLabel}`,
        { errorMessage: error?.message },
      );
    }
    Logger.error(error, { View: this.props.componentLabel, ...errorInfo });
  }

  getErrorMessage = () =>
    `Component: ${this.props.componentLabel}\n${this.state.error.toString()}`;

  render() {
    return this.state.error ? null : this.props.children;
  }
}

export default withMetricsAwareness(ComponentErrorBoundary);
