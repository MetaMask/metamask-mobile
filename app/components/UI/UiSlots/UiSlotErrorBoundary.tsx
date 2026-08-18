import React, { type ReactNode } from 'react';
import Logger from '../../../util/Logger';

interface UiSlotErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  slotId: string;
  contentId: string;
}

interface UiSlotErrorBoundaryState {
  failed: boolean;
}

export class UiSlotErrorBoundary extends React.Component<
  UiSlotErrorBoundaryProps,
  UiSlotErrorBoundaryState
> {
  state: UiSlotErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): UiSlotErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Logger.error(error, {
      tags: { feature: 'ui-slots' },
      context: {
        reason: 'widget-render-failed',
        slotId: this.props.slotId,
        contentId: this.props.contentId,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
