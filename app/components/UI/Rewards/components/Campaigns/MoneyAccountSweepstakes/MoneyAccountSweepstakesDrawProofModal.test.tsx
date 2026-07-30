import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import MoneyAccountSweepstakesDrawProofModal, {
  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS,
  truncateHash,
} from './MoneyAccountSweepstakesDrawProofModal';
import type {
  MoneyAccountSweepstakesDrawProofDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import ClipboardManager from '../../../../../../core/ClipboardManager';

const mockShowToast = jest.fn();

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

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: (title: string) => ({ title }),
    },
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.upcoming_rewards.cta_label': 'Got it',
      'notifications.copied_to_clipboard': 'Copied to clipboard',
    };
    return map[key] ?? key;
  },
}));

const TEST_IDS = MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS;

const localizedText: MoneyAccountSweepstakesLocalizedTextDto = {
  currentBalanceTitle: 'Current balance',
  currentBalanceDescription: 'Current balance description',
  eligibleBalanceTitle: 'Eligible balance',
  eligibleBalanceDescription: 'Eligible balance description',
  entriesTitle: 'Entries',
  entriesDescription: 'Entries description',
  entriesCountValue: '{count} / 7',
  drawScheduleTitle: 'Draw schedule',
  addFundsTitle: 'Add funds',
  addFundsNoBalanceTitle: "You don't have any balance yet",
  addFundsNoBalanceDescription:
    'Deposit crypto or mUSD in your wallet before moving them to Money Account',
  weekTitle: 'Week {number}',
  completeLabel: 'Complete',
  activeLabel: 'Active',
  joinTheSweepstakesTitle: 'Join the Sweepstakes',
  drawPendingTitle: 'Draw pending',
  drawCompleteTitle: 'Winners drawn',
  drawProofTitle: 'Draw proof',
  merkleRootLabel: 'Merkle root',
  formulaLabel: 'Formula',
  drawFormulaLabel: 'Weighted raffle (Efraimidis–Spirakis)',
  drawFormulaDescription:
    'Each day you held at least $100 earned you an entry.',
  seedBlockLabel: 'Seed block number',
  seedBlockHashLabel: 'Seed block hash',
  drawProofEntriesLabel: 'Entries',
  winnersLabel: 'Winners',
  reservesLabel: 'Reserves',
  originalDrawTitle: 'Original draw',
  reserveSuffix: '(reserve)',
  refLabel: 'Ref',
  weightLabel: 'Weight',
  bindingConflictTitle: 'Money Account already linked',
  bindingConflictDescription:
    'Money Account already binds to another Rewards profile.',
  onTrackDescription: "You are on track to earn today's entry.",
  notYetQualifiedDescription:
    "Maintain a balance of $100 or more in your Money Account to earn tomorrow's entry.",
};

const MERKLE_ROOT =
  '0x8b2a9953c4611296a827abf8c47804d7f15f4f627e174f72b62a8e43b2a2db11';
const SEED_HASH =
  '0x7c1e8ab9d4f2a1b0c3e5f678901234567890abcdef1234567890abcdef123456';

const drawProof: MoneyAccountSweepstakesDrawProofDto = {
  explanation: {
    merkleRoot: MERKLE_ROOT,
    seedBlock: 85_400_000,
    seedBlockHash: SEED_HASH,
    formula: 'key_i = -ln(H(seed ‖ id)) / weight',
    entryCount: 128,
    winnerCount: 2,
    reserveCount: 2,
  },
  originalDraw: [
    {
      drawOrder: 1,
      addressPrefix: '0x7a3f',
      refCode: 'WEEK1-A',
      weight: 7,
      isReserve: false,
    },
    {
      drawOrder: 2,
      addressPrefix: '0xb91c',
      refCode: null,
      weight: 6,
      isReserve: true,
    },
  ],
  finalWinners: [],
  adjustmentTrail: [],
};

describe('truncateHash', () => {
  it('truncates long hashes', () => {
    expect(truncateHash(MERKLE_ROOT)).toBe('0x8b2a…db11');
  });

  it('returns short values unchanged', () => {
    expect(truncateHash('0xabc')).toBe('0xabc');
  });
});

describe('MoneyAccountSweepstakesDrawProofModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders summary cells, truncated hashes, seed block, formula, and original draw', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesDrawProofModal
        drawProof={drawProof}
        localizedText={localizedText}
        onClose={onClose}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TITLE)).toHaveTextContent('Draw proof');
    expect(getByTestId(TEST_IDS.ENTRIES)).toHaveTextContent('128');
    expect(getByTestId(TEST_IDS.WINNERS)).toHaveTextContent('2');
    expect(getByTestId(TEST_IDS.RESERVES)).toHaveTextContent('2');
    expect(getByTestId(TEST_IDS.MERKLE_ROOT)).toHaveTextContent('0x8b2a…db11');
    expect(getByTestId(TEST_IDS.SEED_BLOCK)).toHaveTextContent('85400000');
    expect(getByTestId(TEST_IDS.SEED_HASH)).toHaveTextContent('0x7c1e…3456');
    expect(getByTestId(TEST_IDS.FORMULA)).toHaveTextContent(
      'Weighted raffle (Efraimidis–Spirakis)',
    );
    expect(getByText('Original draw')).toBeOnTheScreen();
    expect(getByText('#1 · 0x7a3f')).toBeOnTheScreen();
    expect(getByText('#2 · 0xb91c (reserve)')).toBeOnTheScreen();
  });

  it('copies full merkle root and shows toast', async () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesDrawProofModal
        drawProof={drawProof}
        localizedText={localizedText}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.MERKLE_ROOT_COPY));

    expect(ClipboardManager.setString).toHaveBeenCalledWith(MERKLE_ROOT);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Copied to clipboard',
      });
    });
  });

  it('copies full seed hash', async () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesDrawProofModal
        drawProof={drawProof}
        localizedText={localizedText}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.SEED_HASH_COPY));

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith(SEED_HASH);
    });
  });

  it('expands drawFormulaDescription when drawFormulaLabel is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyAccountSweepstakesDrawProofModal
        drawProof={drawProof}
        localizedText={localizedText}
        onClose={onClose}
      />,
    );

    expect(getByTestId(TEST_IDS.FORMULA)).toHaveTextContent(
      'Weighted raffle (Efraimidis–Spirakis)',
    );
    expect(queryByTestId(TEST_IDS.FORMULA_DESCRIPTION)).toBeNull();

    fireEvent.press(getByTestId(TEST_IDS.FORMULA_TOGGLE));

    expect(getByTestId(TEST_IDS.FORMULA_DESCRIPTION)).toHaveTextContent(
      'Each day you held at least $100 earned you an entry.',
    );

    fireEvent.press(getByTestId(TEST_IDS.FORMULA_TOGGLE));

    expect(queryByTestId(TEST_IDS.FORMULA_DESCRIPTION)).toBeNull();
  });

  it('calls onClose from Got it and close button', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesDrawProofModal
        drawProof={drawProof}
        localizedText={localizedText}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.GOT_IT));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId(TEST_IDS.CLOSE));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
