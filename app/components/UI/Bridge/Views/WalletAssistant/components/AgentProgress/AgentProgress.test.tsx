import { render, screen } from '@testing-library/react-native';
import React from 'react';

import AgentProgress, {
  AGENT_PROGRESS_LABELS,
  AgentProgressStatus,
} from './AgentProgress';
import { AgentProgressTestIds } from './AgentProgress.testIds';

describe('AgentProgress', () => {
  it.each(Object.entries(AGENT_PROGRESS_LABELS))(
    'renders the %s status with its conversational label',
    (status, label) => {
      render(<AgentProgress status={status as AgentProgressStatus} />);

      expect(screen.getByText(label)).toBeOnTheScreen();
      expect(
        screen.getByTestId(AgentProgressTestIds.SPINNER),
      ).toBeOnTheScreen();
    },
  );

  it('announces status updates without interrupting the user', () => {
    const { rerender } = render(
      <AgentProgress status={AgentProgressStatus.Thinking} />,
    );

    const progress = screen.getByTestId(AgentProgressTestIds.CONTAINER);
    expect(progress).toHaveAccessibilityValue({});
    expect(progress.props.accessibilityLabel).toBe('Thinking');
    expect(progress.props.accessibilityLiveRegion).toBe('polite');
    expect(progress.props.accessibilityRole).toBe('progressbar');

    rerender(<AgentProgress status={AgentProgressStatus.SearchingWeb} />);

    expect(
      screen.getByTestId(AgentProgressTestIds.CONTAINER).props
        .accessibilityLabel,
    ).toBe('Searching the web');
  });

  it('supports a custom status label', () => {
    render(
      <AgentProgress
        status={AgentProgressStatus.Thinking}
        label="Reviewing your wallet"
      />,
    );

    expect(screen.getByText('Reviewing your wallet')).toBeOnTheScreen();
    expect(
      screen.getByTestId(AgentProgressTestIds.CONTAINER).props
        .accessibilityLabel,
    ).toBe('Reviewing your wallet');
  });

  it('supports a custom test ID', () => {
    render(
      <AgentProgress
        status={AgentProgressStatus.PreparingQuote}
        testID="custom-progress"
      />,
    );

    expect(screen.getByTestId('custom-progress')).toBeOnTheScreen();
  });
});
