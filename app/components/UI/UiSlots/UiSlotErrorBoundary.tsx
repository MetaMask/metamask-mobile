import React, { type ReactNode } from 'react';
import Logger from '../../../util/Logger';

interface UiSlotErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  slotId: string;
  contentId: string;
  resetKey: object;
}

interface UiSlotErrorBoundaryState {
  failed: boolean;
  resetKey: object;
}

export class UiSlotErrorBoundary extends React.Component<
  UiSlotErrorBoundaryProps,
  UiSlotErrorBoundaryState
> {
  state: UiSlotErrorBoundaryState = {
    failed: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(): Partial<UiSlotErrorBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: UiSlotErrorBoundaryProps,
    state: UiSlotErrorBoundaryState,
  ): Partial<UiSlotErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { failed: false, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Logger.error(error, {
      tags: { feature: 'ui-slots' },
      context: {
        name: 'ui_slots_widget',
        data: {
          reason: 'widget-render-failed',
          slotId: this.props.slotId,
          contentId: this.props.contentId,
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
