import React, { createRef } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import {
  selectGachaEnabledFlag,
  selectGachaHasCompletedOnboarding,
  useCollectorCryptCards,
} from '../../../../UI/Gacha';
import type {
  CollectorCryptCard,
  SolanaAccountRef,
} from '../../../../UI/Gacha/providers/collector-crypt/types';
import useHomeViewedEvent from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { SectionRefreshHandle } from '../../types';
import GachaSection from './GachaSection';
import { GachaSectionTestIds } from './GachaSection.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../UI/Gacha', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    selectGachaEnabledFlag: jest.fn(),
    selectGachaHasCompletedOnboarding: jest.fn(),
    useCollectorCryptCards: jest.fn(),
    CardTile: ({
      card,
      onPress,
      testID,
    }: {
      card: { mint: string; name: string };
      onPress: (mint: string) => void;
      testID?: string;
    }) => (
      <Pressable testID={testID} onPress={() => onPress(card.mint)}>
        <Text>{card.name}</Text>
      </Pressable>
    ),
  };
});

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: { GACHA: 'gacha' },
}));

jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

jest.mock('../../../../UI/NftGrid/NftSkeletonCell', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="nft-skeleton-cell" />;
});

type CardsHookResult = ReturnType<typeof useCollectorCryptCards>;

const ACCOUNT: SolanaAccountRef = {
  id: 'account-id',
  address: 'SoLAddress1111111111111111111111111111111111',
};

const mockRefetch = jest.fn();

const createCard = (mint: string): CollectorCryptCard => ({
  mint,
  name: `Card ${mint}`,
  source: 'nftApi',
  acquiredAt: 0,
  buyback: { status: 'unknown' },
});

const arrange = ({
  isEnabled = true,
  ...cardsHook
}: Partial<CardsHookResult> & { isEnabled?: boolean } = {}): void => {
  jest.mocked(selectGachaEnabledFlag).mockReturnValue(isEnabled);
  jest.mocked(selectGachaHasCompletedOnboarding).mockReturnValue(true);
  jest.mocked(useCollectorCryptCards).mockReturnValue({
    account: ACCOUNT,
    cards: [],
    isLoading: false,
    isSyncing: false,
    error: undefined,
    refetch: mockRefetch,
    ...cardsHook,
  });
};

const renderSection = (ref?: React.Ref<SectionRefreshHandle>) =>
  renderWithProvider(
    <GachaSection ref={ref} sectionIndex={3} totalSectionsLoaded={6} />,
  );

describe('GachaSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  it('renders nothing when the feature flag is off', () => {
    arrange({ isEnabled: false });

    renderSection();

    expect(
      screen.queryByTestId(GachaSectionTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(useCollectorCryptCards).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders the empty section when the selected account group has no Solana account', () => {
    arrange({ account: undefined });

    renderSection();

    expect(
      screen.queryByTestId(GachaSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaSectionTestIds.EMPTY_CTA),
    ).toBeOnTheScreen();
  });

  it('renders the Gacha title and three skeleton cells during the first sync', () => {
    arrange({ isLoading: true, isSyncing: true });

    renderSection();

    expect(screen.getByText(strings('gacha.title'))).toBeOnTheScreen();
    expect(screen.getByTestId(GachaSectionTestIds.SKELETON)).toBeOnTheScreen();
    expect(screen.getAllByTestId('nft-skeleton-cell')).toHaveLength(3);
  });

  it('retries the sync from the error state when the sync failed without cached cards', () => {
    arrange({ error: { code: 'NETWORK_ERROR' } });
    renderSection();

    fireEvent.press(screen.getByText(strings('homepage.error.retry')));

    expect(
      screen.getByText(
        strings('homepage.error.unable_to_load', {
          section: strings('gacha.title'),
        }),
      ),
    ).toBeOnTheScreen();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders cached cards instead of the error state when the sync failed', () => {
    arrange({
      cards: [createCard('mint-1')],
      error: { code: 'NETWORK_ERROR' },
    });

    renderSection();

    expect(
      screen.getByTestId(GachaSectionTestIds.CARD_TILE('mint-1')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('homepage.error.retry')),
    ).not.toBeOnTheScreen();
  });

  it('renders at most six cards', () => {
    const cards = ['1', '2', '3', '4', '5', '6', '7', '8'].map(createCard);
    arrange({ cards });

    renderSection();

    cards.slice(0, 6).forEach((card) => {
      expect(
        screen.getByTestId(GachaSectionTestIds.CARD_TILE(card.mint)),
      ).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId(GachaSectionTestIds.CARD_TILE('7')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaSectionTestIds.EMPTY_STATE),
    ).not.toBeOnTheScreen();
  });

  it('refetches the cards when the refresh handle is called', async () => {
    arrange({ cards: [createCard('mint-1')] });
    const ref = createRef<SectionRefreshHandle>();
    renderSection(ref);

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('skips the refetch on refresh when the feature flag is disabled', async () => {
    arrange({ isEnabled: false });
    const ref = createRef<SectionRefreshHandle>();
    renderSection(ref);

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('reports the section to the viewed event and performance hooks', () => {
    arrange({ cards: [createCard('mint-1'), createCard('mint-2')] });

    renderSection();

    expect(useHomeViewedEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sectionName: 'gacha',
        sectionIndex: 3,
        totalSectionsLoaded: 6,
        isLoading: false,
        isEmpty: false,
        itemCount: 2,
        fireImmediateWhenNoView: false,
      }),
    );
    expect(useSectionPerformance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sectionId: 'gacha',
        contentReady: true,
        isEmpty: false,
        enabled: true,
      }),
    );
  });

  it.each([
    { reason: 'the feature flag is off', isEnabled: false, account: ACCOUNT },
    {
      reason: 'there is no Solana account',
      isEnabled: true,
      account: undefined,
    },
  ])('configures section tracking when $reason', ({ isEnabled, account }) => {
    arrange({ isEnabled, account });

    renderSection();

    expect(useHomeViewedEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sectionRef: isEnabled ? expect.anything() : null,
        fireImmediateWhenNoView: false,
      }),
    );
    expect(useSectionPerformance).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: isEnabled }),
    );
  });
});
