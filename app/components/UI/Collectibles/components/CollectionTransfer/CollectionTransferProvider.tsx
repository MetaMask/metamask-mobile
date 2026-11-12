import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  Dimensions,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CollectiblesCard } from '../../types';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import ReplitCollectionTransfer, {
  type ReplitCollectionTransferCard,
} from '../CollectiblesMotion/ReplitCollectionTransfer';
import type { CollectionTransferRect } from '../CollectiblesMotion/CollectiblesMotion.types';

export interface CollectionTransferSource {
  card: CollectiblesCard;
  from: CollectionTransferRect;
}
type MeasureTarget = (receive: (rect: CollectionTransferRect) => void) => void;
interface TransferContext {
  beginTransfers: (sources: CollectionTransferSource[]) => void;
  cancelTransfers: () => void;
  registerTarget: (mint: string, measure: MeasureTarget) => () => void;
  pendingMints: string[];
  landingMint?: string;
  arrivalValue: number;
  identity?: string;
}
const NO_TRANSFER: TransferContext = {
  beginTransfers: () => undefined,
  cancelTransfers: () => undefined,
  registerTarget: () => () => undefined,
  pendingMints: [],
  arrivalValue: 0,
};
const Context = createContext<TransferContext>(NO_TRANSFER);
export const useCollectionTransfer = () => useContext(Context);

const validRect = (rect: CollectionTransferRect) =>
  Object.values(rect).every(Number.isFinite) &&
  rect.width > 0 &&
  rect.height > 0;

/** Measure actual artwork before navigation. Missing/unmounted/offscreen sources never create flights. */
export const measureTransferSources = async (
  sources: {
    card: CollectiblesCard;
    view: Pick<View, 'measureInWindow'> | null;
  }[],
): Promise<CollectionTransferSource[]> => {
  const viewport = Dimensions.get('window');
  const measured = await Promise.all(
    sources.map(
      ({ card, view }) =>
        new Promise<CollectionTransferSource | undefined>((resolve) => {
          if (!view || !card.image) {
            resolve(undefined);
            return;
          }
          let finished = false;
          const timeout = setTimeout(() => {
            finished = true;
            resolve(undefined);
          }, 100);
          const finish = (result?: CollectionTransferSource) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            resolve(result);
          };
          try {
            view.measureInWindow((left, top, width, height) => {
              const from = { left, top, width, height };
              finish(
                validRect(from) &&
                  left < viewport.width &&
                  top < viewport.height &&
                  left + width > 0 &&
                  top + height > 0
                  ? { card, from }
                  : undefined,
              );
            });
          } catch {
            // A native ref may disappear between the press and its measurement.
            finish();
          }
        }),
    ),
  );
  return measured.filter((source): source is CollectionTransferSource =>
    Boolean(source),
  );
};

/** Presentation-only host above route changes. It never changes owned inventory or navigation. */
export function CollectionTransferProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const tw = useTailwind();
  const { width, height } = useWindowDimensions();
  const { animate } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  const scope = `${PACK_PARTNER_ENVIRONMENT}:${account?.id ?? ''}:${account?.address ?? ''}`;
  const currentScope = useRef(scope);
  const root = useRef<View>(null);
  const targets = useRef(new Map<string, MeasureTarget>());
  const sequence = useRef(0);
  const [reduced, setReduced] = useState(true);
  const [session, setSession] = useState<{
    identity: string;
    scope: string;
    cards: ReplitCollectionTransferCard[];
    landedMints: string[];
    arrivalValue: number;
  }>();
  const [origin, setOrigin] = useState({ left: 0, top: 0 });
  const cancelTransfers = useCallback(() => setSession(undefined), []);
  const completeSession = useCallback(
    (id: string) =>
      setSession((current) => (current?.identity === id ? undefined : current)),
    [],
  );
  const landCard = useCallback((id: string, mint: string) => {
    setSession((current) => {
      if (
        current?.identity !== id ||
        !current.cards.some((card) => card.id === mint) ||
        current.landedMints.includes(mint)
      )
        return current;
      return { ...current, landedMints: [...current.landedMints, mint] };
    });
  }, []);
  const registerTarget = useCallback((mint: string, measure: MeasureTarget) => {
    targets.current.set(mint, measure);
    return () => {
      if (targets.current.get(mint) === measure) targets.current.delete(mint);
    };
  }, []);
  const beginTransfers = useCallback(
    (sources: CollectionTransferSource[]) => {
      if (
        !animate ||
        reduced ||
        AppState.currentState !== 'active' ||
        currentScope.current !== scope
      )
        return;
      const uniqueSources = [
        ...new Map(
          sources
            .filter(
              ({ card, from }) => !card.sale && card.image && validRect(from),
            )
            .map((source) => [source.card.mint, source]),
        ).values(),
      ];
      const cards = uniqueSources.map(({ card, from }) => ({
        id: card.mint,
        front: card.image ?? '',
        from,
      }));
      if (cards.length)
        setSession({
          identity: `${PACK_PARTNER_ENVIRONMENT}-collection-${++sequence.current}`,
          scope,
          cards,
          landedMints: [],
          arrivalValue: uniqueSources.reduce(
            (total, { card }) =>
              total +
              (Number.isFinite(card.insuredValue)
                ? Math.max(0, card.insuredValue ?? 0)
                : 0),
            0,
          ),
        });
    },
    [animate, reduced, scope],
  );
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);
    const preference = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        setReduced(value);
        if (value) cancelTransfers();
      },
    );
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') cancelTransfers();
    });
    return () => {
      mounted = false;
      preference.remove();
      app.remove();
    };
  }, [cancelTransfers]);
  useEffect(() => {
    cancelTransfers();
  }, [width, height, cancelTransfers]);
  useEffect(() => {
    currentScope.current = scope;
    cancelTransfers();
  }, [scope, cancelTransfers]);
  useEffect(() => {
    if (!animate) cancelTransfers();
  }, [animate, cancelTransfers]);
  const visibleSession = session?.scope === scope ? session : undefined;
  const identity = visibleSession?.identity;
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    let frame = 0;
    const started = Date.now();
    const findTargets = () => {
      if (cancelled || Date.now() - started > 1800) return;
      targets.current.forEach((measure, mint) =>
        measure((rect) => {
          if (
            cancelled ||
            !validRect(rect) ||
            rect.top >= height ||
            rect.top + rect.height <= 0
          )
            return;
          setSession((current) => {
            if (!current || current.identity !== identity) return current;
            const card = current.cards.find((entry) => entry.id === mint);
            if (
              !card ||
              (card.to &&
                Object.keys(rect).every(
                  (key) =>
                    card.to?.[key as keyof CollectionTransferRect] ===
                    rect[key as keyof CollectionTransferRect],
                ))
            )
              return current;
            return {
              ...current,
              cards: current.cards.map((entry) =>
                entry.id === mint ? { ...entry, to: rect } : entry,
              ),
            };
          });
        }),
      );
      frame = requestAnimationFrame(findTargets);
    };
    frame = requestAnimationFrame(findTargets);
    // A broken WebView or interrupted navigation must never leave real images hidden.
    const safety = setTimeout(() => completeSession(identity), 3200);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(safety);
    };
  }, [identity, height, completeSession]);
  const localRect = (rect: CollectionTransferRect) => ({
    ...rect,
    left: rect.left - origin.left,
    top: rect.top - origin.top,
  });
  return (
    <Context.Provider
      value={{
        beginTransfers,
        cancelTransfers,
        registerTarget,
        pendingMints:
          visibleSession?.cards
            .filter((card) => !visibleSession.landedMints.includes(card.id))
            .map((card) => card.id) ?? [],
        landingMint: visibleSession?.cards[0]?.id,
        arrivalValue: visibleSession?.arrivalValue ?? 0,
        identity,
      }}
    >
      <View
        ref={root}
        collapsable={false}
        style={tw.style('flex-1')}
        onLayout={() =>
          root.current?.measureInWindow((left, top) => setOrigin({ left, top }))
        }
      >
        {children}
        {visibleSession && (
          <ReplitCollectionTransfer
            identity={visibleSession.identity}
            cards={visibleSession.cards.map((card) => ({
              ...card,
              from: localRect(card.from),
              ...(card.to ? { to: localRect(card.to) } : {}),
            }))}
            onComplete={() => completeSession(visibleSession.identity)}
            onCardLanded={(mint) => landCard(visibleSession.identity, mint)}
          />
        )}
      </View>
    </Context.Provider>
  );
}
