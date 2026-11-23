import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import RewardsMoneyClaimsPausedModal, {
  REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS,
} from './RewardsMoneyClaimsPausedModal';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

let mockLocalizedText:
  | { termsDescription?: string; termsLearnMore?: string; termsUrl?: string }
  | undefined;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector: (state: unknown) => unknown) => selector({})),
}));

jest.mock('../../../../../reducers/rewardsMoney/selectors', () => ({
  selectReferralMeLocalizedText: jest.fn(() => mockLocalizedText),
}));

jest.mock('../../../../../selectors/identity', () => ({
  selectSessionProfileId: jest.fn(() => 'profile-a'),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/glassHeaders',
  () => ({
    selectGlassHeadersEnabled: jest.fn(() => false),
  }),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ButtonIconSize: jest.requireActual('@metamask/design-system-react-native')
      .ButtonIconSize,
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

const TERMS_DESCRIPTION = 'Rewards are paid in mUSD under these terms.';
const TERMS_LEARN_MORE = 'Learn more';
const TERMS_URL = 'https://example.com/terms';

const TOTALS = {
  lifetime_total: '132000000',
  claimable: '0',
  held: '100000000',
  blocked: '12000000',
  voided: '6000000',
  pending: '4000000',
  claimed: '10000000',
};

function renderedTestIds(node: unknown): string[] {
  if (!node || typeof node === 'string') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(renderedTestIds);
  }
  if (typeof node !== 'object') {
    return [];
  }
  const record = node as {
    props?: { testID?: unknown };
    children?: unknown[] | null;
  };
  const own =
    typeof record.props?.testID === 'string' ? [record.props.testID] : [];
  return [...own, ...(record.children ?? []).flatMap(renderedTestIds)];
}

const LABELS = {
  breakdown: 'Breakdown',
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
    mockLocalizedText = {
      termsDescription: TERMS_DESCRIPTION,
      termsLearnMore: TERMS_LEARN_MORE,
      termsUrl: TERMS_URL,
    };
  });

  it('renders the title, description, totals, and the terms button', () => {
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
    const divider = getByTestId(TEST_IDS.DIVIDER);
    expect(getByTestId(TEST_IDS.DESCRIPTION)).not.toContainElement(divider);
    expect(divider).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.BREAKDOWN_HEADER)).toHaveTextContent(
      'Breakdown',
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
    expect(getByTestId(TEST_IDS.TERMS_DIVIDER)).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TERMS_DESCRIPTION)).toHaveTextContent(
      TERMS_DESCRIPTION,
    );
    expect(getByText(TERMS_LEARN_MORE)).toBeOnTheScreen();
    expect(queryByText('Got it')).not.toBeOnTheScreen();
  });

  it('shows the balance rows with the terms button without the paused explanation', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <RewardsMoneyClaimsPausedModal
        route={{
          params: {
            variant: 'breakdown',
            title: 'Breakdown',
            totals: TOTALS,
            labels: LABELS,
          },
        }}
      />,
    );

    expect(getByTestId(TEST_IDS.TITLE)).toHaveTextContent('Breakdown');
    expect(queryByTestId(TEST_IDS.DESCRIPTION)).toBeNull();
    expect(queryByTestId(TEST_IDS.DIVIDER)).toBeNull();
    expect(queryByTestId(TEST_IDS.BREAKDOWN_HEADER)).toBeNull();
    expect(queryByText('You cannot claim rewards right now.')).toBeNull();
    expect(getByText('Recorded earnings')).toBeOnTheScreen();
    expect(getByText('$132.00')).toBeOnTheScreen();
    expect(getByText('Held')).toBeOnTheScreen();
    expect(getByText('$100.00')).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TERMS_DESCRIPTION)).toHaveTextContent(
      TERMS_DESCRIPTION,
    );
    expect(getByText(TERMS_LEARN_MORE)).toBeOnTheScreen();
    expect(queryByText('Got it')).not.toBeOnTheScreen();
  });

  it('lists Pending above Held and hides zero Held, Blocked, and Voided', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <RewardsMoneyClaimsPausedModal
        route={{
          params: {
            title: 'Claims paused',
            description: 'You cannot claim rewards right now.',
            totals: {
              ...TOTALS,
              held: '0',
              blocked: '0',
              voided: '0',
            },
            labels: LABELS,
          },
        }}
      />,
    );

    expect(queryByTestId(`${TEST_IDS.TOTALS}-held`)).toBeNull();
    expect(queryByTestId(`${TEST_IDS.TOTALS}-blocked`)).toBeNull();
    expect(queryByTestId(`${TEST_IDS.TOTALS}-voided`)).toBeNull();
    expect(queryByText('Held')).toBeNull();
    expect(queryByText('Blocked')).toBeNull();
    expect(queryByText('Voided')).toBeNull();
    expect(getByText('Pending')).toBeOnTheScreen();
    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(getByText('$0.00')).toBeOnTheScreen();

    const pending = getByTestId(`${TEST_IDS.TOTALS}-pending`);
    const claimed = getByTestId(`${TEST_IDS.TOTALS}-claimed`);
    const claimable = getByTestId(`${TEST_IDS.TOTALS}-claimable`);
    expect(claimable).toBeOnTheScreen();
    expect(pending).toBeOnTheScreen();
    expect(claimed).toBeOnTheScreen();
  });

  it('lists Pending before Held when both are positive', () => {
    const { toJSON } = render(
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

    const ids = renderedTestIds(toJSON());
    const pendingIndex = ids.indexOf(`${TEST_IDS.TOTALS}-pending`);
    const heldIndex = ids.indexOf(`${TEST_IDS.TOTALS}-held`);
    const claimedIndex = ids.indexOf(`${TEST_IDS.TOTALS}-claimed`);
    const termsIndex = ids.indexOf(TEST_IDS.TERMS_DESCRIPTION);
    expect(pendingIndex).toBeGreaterThanOrEqual(0);
    expect(heldIndex).toBeGreaterThan(pendingIndex);
    expect(termsIndex).toBeGreaterThan(claimedIndex);
  });

  it('hides the terms description when the copy is empty', () => {
    mockLocalizedText = {
      termsLearnMore: TERMS_LEARN_MORE,
      termsUrl: TERMS_URL,
    };
    const { queryByTestId, getByText } = render(
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

    expect(queryByTestId(TEST_IDS.TERMS_DIVIDER)).toBeNull();
    expect(queryByTestId(TEST_IDS.TERMS_DESCRIPTION)).toBeNull();
    expect(getByText(TERMS_LEARN_MORE)).toBeOnTheScreen();
  });

  it('opens the terms URL in the browser when the terms button is pressed', () => {
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

    fireEvent.press(getByTestId(TEST_IDS.TERMS));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: TERMS_URL,
        timestamp: expect.any(Number),
      },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows Got it and goes back on the paused sheet when there is no terms URL', () => {
    mockLocalizedText = {
      termsDescription: TERMS_DESCRIPTION,
      termsLearnMore: TERMS_LEARN_MORE,
      termsUrl: '   ',
    };
    const { getByTestId, getByText, queryByTestId, queryByText } = render(
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

    expect(queryByTestId(TEST_IDS.TERMS)).toBeNull();
    expect(queryByText(TERMS_LEARN_MORE)).toBeNull();
    expect(getByTestId(TEST_IDS.TERMS_DESCRIPTION)).toHaveTextContent(
      TERMS_DESCRIPTION,
    );
    expect(getByText('Got it')).toBeOnTheScreen();

    fireEvent.press(getByTestId(TEST_IDS.GOT_IT));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows Got it on the breakdown sheet when there is no terms URL', () => {
    mockLocalizedText = {
      termsDescription: TERMS_DESCRIPTION,
      termsLearnMore: TERMS_LEARN_MORE,
    };
    const { getByTestId, queryByTestId } = render(
      <RewardsMoneyClaimsPausedModal
        route={{
          params: {
            variant: 'breakdown',
            title: 'Breakdown',
            totals: TOTALS,
            labels: LABELS,
          },
        }}
      />,
    );

    expect(queryByTestId(TEST_IDS.TERMS)).toBeNull();

    fireEvent.press(getByTestId(TEST_IDS.GOT_IT));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
