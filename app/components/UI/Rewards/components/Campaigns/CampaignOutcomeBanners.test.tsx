import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  WinnerPendingBanner,
  WinnerFinalizedBanner,
  ParticipantFinalizedBanner,
  ParticipantPendingBanner,
  CampaignOutcomeBanner,
} from './CampaignOutcomeBanners';

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
  it('renders title and description using consolidated locale keys', () => {
    const { getByText } = render(<WinnerPendingBanner onPress={jest.fn()} />);
    expect(
      getByText('rewards.campaign_outcome_banner.winner_pending.title'),
    ).toBeDefined();
    expect(
      getByText('rewards.campaign_outcome_banner.winner_pending.description'),
    ).toBeDefined();
  });

  it('has the correct accessibilityLabel on the pressable', () => {
    const { getByLabelText } = render(
      <WinnerPendingBanner onPress={jest.fn()} />,
    );
    expect(
      getByLabelText('rewards.campaign_outcome_banner.winner_pending.a11y'),
    ).toBeDefined();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <WinnerPendingBanner onPress={onPress} />,
    );
    fireEvent.press(
      getByLabelText('rewards.campaign_outcome_banner.winner_pending.a11y'),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('WinnerFinalizedBanner', () => {
  it('renders with consolidated winner_finalized strings', () => {
    const { getByText } = render(<WinnerFinalizedBanner />);
    expect(
      getByText('rewards.campaign_outcome_banner.winner_finalized.title'),
    ).toBeDefined();
    expect(
      getByText('rewards.campaign_outcome_banner.winner_finalized.description'),
    ).toBeDefined();
  });
});

describe('ParticipantFinalizedBanner', () => {
  it('renders with consolidated participant_finalized strings', () => {
    const { getByText } = render(<ParticipantFinalizedBanner />);
    expect(
      getByText('rewards.campaign_outcome_banner.participant_finalized.title'),
    ).toBeDefined();
    expect(
      getByText(
        'rewards.campaign_outcome_banner.participant_finalized.description',
      ),
    ).toBeDefined();
  });
});

describe('ParticipantPendingBanner', () => {
  it('renders with consolidated participant_pending strings', () => {
    const { getByText } = render(<ParticipantPendingBanner />);
    expect(
      getByText('rewards.campaign_outcome_banner.participant_pending.title'),
    ).toBeDefined();
    expect(
      getByText(
        'rewards.campaign_outcome_banner.participant_pending.description',
      ),
    ).toBeDefined();
  });
});

describe('CampaignOutcomeBanner', () => {
  const onWinnerPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders WinnerPendingBanner when winner code is present and status is pending', () => {
    const { getByLabelText } = render(
      <CampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode="LVL346"
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByLabelText('rewards.campaign_outcome_banner.winner_pending.a11y'),
    ).toBeDefined();
  });

  it('renders WinnerFinalizedBanner when winner code is present and status is finalized', () => {
    const { getByText, queryByLabelText } = render(
      <CampaignOutcomeBanner
        outcomeStatus="finalized"
        winnerVerificationCode="LVL346"
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.campaign_outcome_banner.winner_finalized.title'),
    ).toBeDefined();
    expect(
      queryByLabelText('rewards.campaign_outcome_banner.winner_pending.a11y'),
    ).toBeNull();
  });

  it('renders ParticipantFinalizedBanner when no code and status is finalized', () => {
    const { getByText } = render(
      <CampaignOutcomeBanner
        outcomeStatus="finalized"
        winnerVerificationCode={null}
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.campaign_outcome_banner.participant_finalized.title'),
    ).toBeDefined();
  });

  it('renders ParticipantPendingBanner when no code and status is pending', () => {
    const { getByText } = render(
      <CampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode={null}
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.campaign_outcome_banner.participant_pending.title'),
    ).toBeDefined();
  });

  it('renders ParticipantPendingBanner when winnerVerificationCode is undefined', () => {
    const { getByText } = render(
      <CampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode={undefined}
        onWinnerPress={onWinnerPress}
      />,
    );
    expect(
      getByText('rewards.campaign_outcome_banner.participant_pending.title'),
    ).toBeDefined();
  });

  it('calls onWinnerPress when WinnerPendingBanner is pressed', () => {
    const mockOnWinnerPress = jest.fn();
    const { getByLabelText } = render(
      <CampaignOutcomeBanner
        outcomeStatus="pending"
        winnerVerificationCode="LVL346"
        onWinnerPress={mockOnWinnerPress}
      />,
    );
    fireEvent.press(
      getByLabelText('rewards.campaign_outcome_banner.winner_pending.a11y'),
    );
    expect(mockOnWinnerPress).toHaveBeenCalledTimes(1);
  });
});
