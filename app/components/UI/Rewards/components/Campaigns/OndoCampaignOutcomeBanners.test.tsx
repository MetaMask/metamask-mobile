import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  WinnerPendingBanner,
  WinnerFinalizedBanner,
  ParticipantFinalizedBanner,
  ParticipantPendingBanner,
  OndoGmCampaignOutcomeBanner,
} from './OndoCampaignOutcomeBanners';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, description }: { title: string; description: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-info-banner' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Text, null, description),
      ),
  };
});

describe('WinnerPendingBanner', () => {
  it('renders title and description', () => {
    const { getByText } = render(<WinnerPendingBanner onPress={jest.fn()} />);
    expect(
      getByText('rewards.ondo_outcome_banner.winner_pending.title'),
    ).toBeDefined();
    expect(
      getByText('rewards.ondo_outcome_banner.winner_pending.description'),
    ).toBeDefined();
  });

  it('has the correct accessibilityLabel on the pressable', () => {
    const { getByLabelText } = render(
      <WinnerPendingBanner onPress={jest.fn()} />,
    );
    expect(
      getByLabelText('rewards.ondo_outcome_banner.winner_pending.a11y'),
    ).toBeDefined();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <WinnerPendingBanner onPress={onPress} />,
    );
    fireEvent.press(
      getByLabelText('rewards.ondo_outcome_banner.winner_pending.a11y'),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('WinnerFinalizedBanner', () => {
  it('renders with winner_finalized strings', () => {
    const { getByText } = render(<WinnerFinalizedBanner />);
    expect(
      getByText('rewards.ondo_outcome_banner.winner_finalized.title'),
    ).toBeDefined();
    expect(
      getByText('rewards.ondo_outcome_banner.winner_finalized.description'),
    ).toBeDefined();
  });
});

describe('ParticipantFinalizedBanner', () => {
  it('renders with participant_finalized strings', () => {
    const { getByText } = render(<ParticipantFinalizedBanner />);
    expect(
      getByText('rewards.ondo_outcome_banner.participant_finalized.title'),
    ).toBeDefined();
    expect(
      getByText(
        'rewards.ondo_outcome_banner.participant_finalized.description',
      ),
    ).toBeDefined();
  });
});

describe('ParticipantPendingBanner', () => {
  it('renders with participant_pending strings', () => {
    const { getByText } = render(<ParticipantPendingBanner />);
    expect(
      getByText('rewards.ondo_outcome_banner.participant_pending.title'),
    ).toBeDefined();
    expect(
      getByText('rewards.ondo_outcome_banner.participant_pending.description'),
    ).toBeDefined();
  });
});

describe('OndoGmCampaignOutcomeBanner', () => {
  const onWinnerPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders WinnerPendingBanner when winner code is present and status is pending', () => {
    const { getByLabelText } = render(
      <OndoGmCampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode="LVL346"
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByLabelText('rewards.ondo_outcome_banner.winner_pending.a11y'),
    ).toBeDefined();
  });

  it('renders WinnerFinalizedBanner when winner code is present and status is finalized', () => {
    const { getByText, queryByLabelText } = render(
      <OndoGmCampaignOutcomeBanner
        outcomeStatus="finalized"
        winnerVerificationCode="LVL346"
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.ondo_outcome_banner.winner_finalized.title'),
    ).toBeDefined();
    expect(
      queryByLabelText('rewards.ondo_outcome_banner.winner_pending.a11y'),
    ).toBeNull();
  });

  it('renders ParticipantFinalizedBanner when no code and status is finalized', () => {
    const { getByText } = render(
      <OndoGmCampaignOutcomeBanner
        outcomeStatus="finalized"
        winnerVerificationCode={null}
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.ondo_outcome_banner.participant_finalized.title'),
    ).toBeDefined();
  });

  it('renders ParticipantPendingBanner when no code and status is pending', () => {
    const { getByText } = render(
      <OndoGmCampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode={null}
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.ondo_outcome_banner.participant_pending.title'),
    ).toBeDefined();
  });

  it('renders ParticipantPendingBanner when winnerVerificationCode is undefined', () => {
    const { getByText } = render(
      <OndoGmCampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode={undefined}
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.ondo_outcome_banner.participant_pending.title'),
    ).toBeDefined();
  });

  it('calls onWinnerPress when WinnerPendingBanner is pressed', () => {
    const mockOnWinnerPress = jest.fn();
    const { getByLabelText } = render(
      <OndoGmCampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode="LVL346"
        onWinnerPress={mockOnWinnerPress}
      />,
    );
    fireEvent.press(
      getByLabelText('rewards.ondo_outcome_banner.winner_pending.a11y'),
    );
    expect(mockOnWinnerPress).toHaveBeenCalledTimes(1);
  });
});
