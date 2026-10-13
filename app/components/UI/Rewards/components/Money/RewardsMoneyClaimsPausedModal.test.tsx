import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsMoneyClaimsPausedModal, {
  REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS,
} from './RewardsMoneyClaimsPausedModal';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({
      children,
      testID,
      onClose,
    }: {
      children: React.ReactNode;
      testID?: string;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        RN.View,
        { testID },
        children,
        ReactActual.createElement(RN.Pressable, {
          testID: 'bottom-sheet-backdrop',
          onPress: onClose,
        }),
      ),
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        RN.Pressable,
        { onPress, testID },
        ReactActual.createElement(RN.Text, null, children),
      ),
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) => ReactActual.createElement(RN.Pressable, { onPress, testID }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.upcoming_rewards.cta_label': 'Got it',
    };
    return map[key] ?? key;
  },
}));

const TEST_IDS = REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS;

const TOTALS = {
  lifetime_total: '132000000',
  claimable: '0',
  held: '100000000',
  blocked: '12000000',
  voided: '6000000',
  pending: '4000000',
  claimed: '10000000',
};

const LABELS = {
  recordedEarningsLabel: 'Recorded earnings',
  availableToClaim: 'Available to claim',
  held: 'Held',
  blocked: 'Blocked',
  voided: 'Voided',
  pending: 'Pending',
  claimed: 'Claimed',
};

describe('RewardsMoneyClaimsPausedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description, totals, and Got it', () => {
    const { getByTestId, getByText, queryByText } = render(
      <RewardsMoneyClaimsPausedModal
        route={{
          params: {
            title: 'Claims paused',
            description: 'You cannot claim rewards right now.',
            totals: TOTALS,
            labels: LABELS,
          },
        }}
      />,
    );

    expect(getByTestId(TEST_IDS.TITLE)).toHaveTextContent('Claims paused');
    expect(getByTestId(TEST_IDS.DESCRIPTION)).toHaveTextContent(
      'You cannot claim rewards right now.',
    );
    expect(getByText('Recorded earnings')).toBeOnTheScreen();
    expect(getByText('$132.00')).toBeOnTheScreen();
    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(getByText('Held')).toBeOnTheScreen();
    expect(getByText('$100.00')).toBeOnTheScreen();
    expect(getByText('Blocked')).toBeOnTheScreen();
    expect(getByText('$12.00')).toBeOnTheScreen();
    expect(getByText('Voided')).toBeOnTheScreen();
    expect(getByText('$6.00')).toBeOnTheScreen();
    expect(getByText('Pending')).toBeOnTheScreen();
    expect(getByText('$4.00')).toBeOnTheScreen();
    expect(getByText('Claimed')).toBeOnTheScreen();
    expect(getByText('$10.00')).toBeOnTheScreen();
    expect(queryByText('Blocking reason')).not.toBeOnTheScreen();
    expect(queryByText('SUSPENDED')).not.toBeOnTheScreen();
    expect(getByText('Got it')).toBeOnTheScreen();
  });

  it('goes back when Got it is pressed', () => {
    const { getByTestId } = render(
      <RewardsMoneyClaimsPausedModal
        route={{
          params: {
            title: 'Claims paused',
            description: 'You cannot claim rewards right now.',
            totals: TOTALS,
            labels: LABELS,
          },
        }}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.GOT_IT));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
