import React, { useEffect } from 'react';
import { AccessibilityInfo, AppState, Button, Text } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createCard } from '../../views/testUtils';
import ReplitCollectionTransfer from '../CollectiblesMotion/ReplitCollectionTransfer';
import {
  CollectionTransferProvider,
  measureTransferSources,
  useCollectionTransfer,
} from './CollectionTransferProvider';

// Native layout/WebView contract: CV cannot provide real measureInWindow coordinates.
jest.mock('../CollectiblesMotion/ReplitCollectionTransfer', () =>
  jest.fn(() => null),
);
jest.mock('../../hooks/useCollectiblesPresentation', () => ({
  useCollectiblesPresentation: () => ({ animate: true }),
}));
let mockAccount = { id: 'account-a', address: 'wallet-a' };
jest.mock('../../providers/pack-partner/hooks/usePackPartnerAccount', () => ({
  usePackPartnerAccount: () => mockAccount,
}));

const CARD = createCard({
  image: 'https://example.com/slab.png',
  insuredValue: 50,
});
const FROM = { left: 20, top: 120, width: 180, height: 270 };
const TO = { left: 10, top: 220, width: 100, height: 150 };
const mockMeasure = jest.fn((receive: (rect: typeof TO) => void) =>
  receive(TO),
);

function Probe({
  target = false,
  cards = [CARD],
}: {
  target?: boolean;
  cards?: (typeof CARD)[];
}) {
  const {
    beginTransfers,
    pendingMints,
    registerTarget,
    landingMint,
    arrivalValue,
  } = useCollectionTransfer();
  useEffect(
    () => (target ? registerTarget(CARD.mint, mockMeasure) : undefined),
    [target, registerTarget],
  );
  return (
    <>
      <Button
        title="Keep"
        onPress={() =>
          beginTransfers(cards.map((card) => ({ card, from: FROM })))
        }
      />
      <Text testID="pending">{pendingMints.join(',')}</Text>
      <Text testID="landing">{landingMint}</Text>
      <Text testID="arrival">{arrivalValue}</Text>
    </>
  );
}
const host = (target = false, cards = [CARD]) => (
  <CollectionTransferProvider>
    <Probe target={target} cards={cards} />
  </CollectionTransferProvider>
);
const start = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.press(screen.getByText('Keep'));
};

describe('CollectionTransfer native host', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAccount = { id: 'account-a', address: 'wallet-a' };
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps the captured source above route changes and accepts a late measured destination', async () => {
    const { rerender } = renderWithProvider(host());
    await start();
    expect(screen.getByTestId('pending')).toHaveTextContent(CARD.mint);
    expect(
      jest.mocked(ReplitCollectionTransfer).mock.lastCall?.[0].cards,
    ).toEqual([{ id: CARD.mint, front: CARD.image, from: FROM }]);

    rerender(host(true));
    act(() => jest.advanceTimersByTime(32));

    const flight = jest.mocked(ReplitCollectionTransfer).mock.lastCall?.[0];
    expect(flight?.cards[0]).toEqual({
      id: CARD.mint,
      front: CARD.image,
      from: FROM,
      to: TO,
    });
    act(() => flight?.onComplete());
    expect(screen.getByTestId('pending')).toHaveTextContent(/^$/u);
  });

  it('clears the flight and hidden target identities when the selected account changes', async () => {
    const { rerender } = renderWithProvider(host(true));
    await start();
    expect(screen.getByTestId('pending')).toHaveTextContent(CARD.mint);

    mockAccount = { id: 'account-b', address: 'wallet-b' };
    rerender(host(true));

    expect(screen.getByTestId('pending')).toHaveTextContent(/^$/u);
    const count = jest.mocked(ReplitCollectionTransfer).mock.calls.length;
    act(() => jest.advanceTimersByTime(4000));
    expect(jest.mocked(ReplitCollectionTransfer)).toHaveBeenCalledTimes(count);
  });

  it('clears an unreachable target after the bounded presentation timeout', async () => {
    renderWithProvider(host());
    await start();
    expect(screen.getByTestId('pending')).toHaveTextContent(CARD.mint);

    act(() => jest.advanceTimersByTime(3200));

    expect(screen.getByTestId('pending')).toHaveTextContent(/^$/u);
  });

  it('cancels measurements and removes its app subscription on unmount', async () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
    const { unmount } = renderWithProvider(host(true));
    await start();
    act(() => jest.advanceTimersByTime(32));
    const count = mockMeasure.mock.calls.length;
    expect(count).toBeGreaterThan(0);

    unmount();
    act(() => jest.advanceTimersByTime(4000));

    expect(remove).toHaveBeenCalled();
    expect(mockMeasure).toHaveBeenCalledTimes(count);
  });

  it('does not launch a flight for reduced motion', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    renderWithProvider(host(true));

    await start();

    expect(screen.getByTestId('pending')).toHaveTextContent(/^$/u);
    expect(ReplitCollectionTransfer).not.toHaveBeenCalled();
  });

  it('fails closed for absent, offscreen and nonresponsive native source views', async () => {
    const promise = measureTransferSources([
      { card: CARD, view: null },
      {
        card: CARD,
        view: { measureInWindow: (receive) => receive(0, -500, 100, 150) },
      },
      { card: CARD, view: { measureInWindow: () => undefined } },
    ]);

    act(() => jest.advanceTimersByTime(100));

    expect(await promise).toEqual([]);
  });

  it('ignores a late completion from an earlier flight', async () => {
    renderWithProvider(host());
    await start();
    const earlier = jest.mocked(ReplitCollectionTransfer).mock.lastCall?.[0];
    fireEvent.press(screen.getByText('Keep'));
    const current = jest.mocked(ReplitCollectionTransfer).mock.lastCall?.[0];
    expect(current?.identity).not.toBe(earlier?.identity);

    act(() => {
      earlier?.onCardLanded?.(CARD.mint);
      earlier?.onComplete();
    });

    expect(screen.getByTestId('pending')).toHaveTextContent(CARD.mint);
    act(() => current?.onComplete());
    expect(screen.getByTestId('pending')).toHaveTextContent(/^$/u);
  });

  it('restores each landed image without moving the batch landing target or changing its value', async () => {
    const second = createCard({
      mint: 'second-mint',
      image: 'https://example.com/second.png',
      insuredValue: 30,
    });
    const sold = createCard({
      mint: 'sold-mint',
      image: CARD.image,
      insuredValue: 1000,
      sale: { status: 'completed', amount: '850000000', updatedAt: 1 },
    });
    renderWithProvider(host(false, [CARD, CARD, second, sold]));
    await start();
    const flight = jest.mocked(ReplitCollectionTransfer).mock.lastCall?.[0];
    expect(flight?.cards.map((card) => card.id)).toEqual([
      CARD.mint,
      second.mint,
    ]);
    expect(screen.getByTestId('arrival')).toHaveTextContent('80');

    act(() => {
      flight?.onCardLanded?.(CARD.mint);
      flight?.onCardLanded?.(CARD.mint);
      flight?.onCardLanded?.('unrelated-mint');
    });

    expect(screen.getByTestId('pending')).toHaveTextContent(second.mint);
    expect(screen.getByTestId('pending')).not.toHaveTextContent(CARD.mint);
    expect(screen.getByTestId('landing')).toHaveTextContent(CARD.mint);
    expect(screen.getByTestId('arrival')).toHaveTextContent('80');
    expect(
      jest.mocked(ReplitCollectionTransfer).mock.lastCall?.[0].cards,
    ).toHaveLength(2);
  });

  it('clears hidden images when the app enters the background', async () => {
    const app = jest.spyOn(AppState, 'addEventListener');
    renderWithProvider(host());
    await start();

    act(() =>
      app.mock.calls.find(([event]) => event === 'change')?.[1]('background'),
    );

    expect(screen.getByTestId('pending')).toHaveTextContent(/^$/u);
    expect(screen.getByTestId('arrival')).toHaveTextContent('0');
  });
});
