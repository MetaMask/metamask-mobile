import React, { createRef } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  selectCollectiblesEnabledFlag,
  selectCollectiblesHasCompletedOnboarding,
  usePackPartnerCards,
} from '../../../../UI/Collectibles';
import type {
  CollectiblesCard,
  CollectiblesWalletAccount,
} from '../../../../UI/Collectibles/types';
import useHomeViewedEvent from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { SectionRefreshHandle } from '../../types';
import CollectiblesSection from './CollectiblesSection';
import CardTileSkeleton from '../../../../UI/Collectibles/components/CardTile/CardTileSkeleton';
import { usePackPartnerPacks } from '../../../../UI/Collectibles/providers/pack-partner/hooks/usePackPartnerPacks';
import { CollectiblesSectionTestIds } from './CollectiblesSection.testIds';
import { renderWithQueryClient } from '../../../../UI/Collectibles/views/testUtils';

const mockNavigate = jest.fn();
jest.mock(
  '../../../../UI/Collectibles/providers/pack-partner/hooks/usePackPartnerPacks',
);
jest.mock(
  '../../../../UI/Collectibles/providers/pack-partner/hooks/useUsdcBalance',
  () => ({
    useUsdcBalance: () => ({ baseUnits: 100_000_000n }),
  }),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => true,
}));

jest.mock('../../../../UI/Collectibles', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    selectCollectiblesEnabledFlag: jest.fn(),
    selectCollectiblesHasCompletedOnboarding: jest.fn(),
    usePackPartnerCards: jest.fn(),
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
  HomeSectionNames: { COLLECTIBLES: 'collectibles' },
}));

jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

jest.mock('../../../../UI/NftGrid/NftSkeletonCell', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="nft-skeleton-cell" />;
});

type CardsHookResult = ReturnType<typeof usePackPartnerCards>;

const ACCOUNT: CollectiblesWalletAccount = {
  id: 'account-id',
  address: 'SoLAddress1111111111111111111111111111111111',
};

const mockRefetch = jest.fn();

const createCard = (mint: string): CollectiblesCard => ({
  mint,
  name: `Card ${mint}`,
  acquiredAt: 0,
  buyback: { status: 'unknown' },
});

const arrange = ({
  isEnabled = true,
  ...cardsHook
}: Partial<CardsHookResult> & { isEnabled?: boolean } = {}): void => {
  jest.mocked(selectCollectiblesEnabledFlag).mockReturnValue(isEnabled);
  jest.mocked(selectCollectiblesHasCompletedOnboarding).mockReturnValue(true);
  jest.mocked(usePackPartnerCards).mockReturnValue({
    account: ACCOUNT,
    cards: [],
    hasLoaded: true,
    isLoading: false,
    error: undefined,
    refetch: mockRefetch,
    ...cardsHook,
  });
};

// Discovery reads use data-service queries.
const renderSection = (ref?: React.Ref<SectionRefreshHandle>) =>
  renderWithQueryClient(
    <CollectiblesSection ref={ref} sectionIndex={3} totalSectionsLoaded={6} />,
  );

describe('CollectiblesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
    jest.mocked(usePackPartnerPacks).mockReturnValue({
      packs: [],
      isOffline: false,
      isLoading: false,
      error: undefined,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('renders nothing when the feature flag is off', () => {
    arrange({ isEnabled: false });

    renderSection();

    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(usePackPartnerCards).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders the empty section when the selected account group has no Solana account', () => {
    arrange({ account: undefined });

    renderSection();

    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.EMPTY_CTA),
    ).toBeOnTheScreen();
  });

  it('renders the Collectibles title and three skeleton cells during the first read', () => {
    arrange({ isLoading: true });

    renderSection();

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesSectionTestIds.SKELETON),
    ).toBeOnTheScreen();
    expect(screen.UNSAFE_getAllByType(CardTileSkeleton)).toHaveLength(3);
  });

  it('retries the read from the error state when the read failed without cards', () => {
    arrange({ error: { code: 'NETWORK_ERROR' } });
    renderSection();

    fireEvent.press(screen.getByText(strings('homepage.error.retry')));

    expect(
      screen.getByText(
        strings('homepage.error.unable_to_load', {
          section: strings('collectibles.title'),
        }),
      ),
    ).toBeOnTheScreen();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders cards already read instead of the error state when the read failed', () => {
    arrange({
      cards: [createCard('mint-1')],
      error: { code: 'NETWORK_ERROR' },
    });

    renderSection();

    expect(
      screen.getByTestId(CollectiblesSectionTestIds.CARD_TILE('mint-1')),
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
        screen.getByTestId(CollectiblesSectionTestIds.CARD_TILE(card.mint)),
      ).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.CARD_TILE('7')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.EMPTY_STATE),
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
        sectionName: 'collectibles',
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
        sectionId: 'collectibles',
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
