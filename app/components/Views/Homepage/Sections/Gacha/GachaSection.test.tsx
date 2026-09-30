import React, { createRef } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectGachaEnabledFlag,
  useCollectorCryptCards,
} from '../../../../UI/Gacha';
import type {
  CollectorCryptCard,
  SolanaAccountRef,
} from '../../../../UI/Gacha/providers/collector-crypt/types';
import useHomeViewedEvent from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
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

  it('renders the section when enabled without a Solana account', () => {
    arrange({ account: undefined });

    renderSection();

    expect(
      screen.queryByTestId(GachaSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the Gacha title and three skeleton cells during the first sync', () => {
    arrange({ isLoading: true, isSyncing: true });

    renderSection();

    expect(screen.getByText('Gacha')).toBeOnTheScreen();
    expect(screen.getByTestId(GachaSectionTestIds.SKELETON)).toBeOnTheScreen();
    expect(screen.getAllByTestId('nft-skeleton-cell')).toHaveLength(3);
  });

  it('retries the sync from the error state when the sync failed without cached cards', () => {
    arrange({ error: { code: 'NETWORK_ERROR' } });
    renderSection();

    fireEvent.press(screen.getByText('Retry'));

    expect(screen.getByText('Unable to load Gacha')).toBeOnTheScreen();
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
    expect(screen.queryByText('Retry')).not.toBeOnTheScreen();
  });

  it('opens the packs tab from the empty state CTA', () => {
    arrange();
    renderSection();

    fireEvent.press(screen.getByTestId(GachaSectionTestIds.EMPTY_CTA));

    expect(
      screen.getByTestId(GachaSectionTestIds.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Open a pack and collect graded trading cards.'),
    ).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.ROOT, {
      screen: Routes.GACHA.HOME,
      params: { initialTab: 'packs' },
    });
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

  it('opens the card with the collection underneath when a card is pressed', () => {
    arrange({ cards: [createCard('mint-1')] });
    renderSection();

    fireEvent.press(
      screen.getByTestId(GachaSectionTestIds.CARD_TILE('mint-1')),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.ROOT, {
      state: {
        index: 1,
        routes: [
          { name: Routes.GACHA.HOME, params: { initialTab: 'cards' } },
          { name: Routes.GACHA.CARD, params: { mint: 'mint-1' } },
        ],
      },
    });
  });

  it('opens the packs tab from the header even when the account has cards', () => {
    arrange({ cards: [createCard('mint-1')] });
    renderSection();

    fireEvent.press(screen.getByTestId(homepageSectionTitleTestId('gacha')));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.ROOT, {
      screen: Routes.GACHA.HOME,
      params: { initialTab: 'packs' },
    });
  });

  it('opens the packs tab from the header when the account has no card', () => {
    arrange();
    renderSection();

    fireEvent.press(screen.getByTestId(homepageSectionTitleTestId('gacha')));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.GACHA.ROOT, {
      screen: Routes.GACHA.HOME,
      params: { initialTab: 'packs' },
    });
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

  it('does not report the section as viewed when hidden', () => {
    arrange({ isEnabled: false });

    renderSection();

    expect(useHomeViewedEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ sectionRef: null }),
    );
    expect(useSectionPerformance).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
