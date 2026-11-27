import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { quoteOrder, type ProtoAvatar } from './fixtures';
import { useLiveTicker } from './usePrototypeMotion';

export interface ProtoOrderOption {
  outcomeId: string;
  label: string;
  price: number;
  color: string;
  avatar?: ProtoAvatar;
}

export interface ProtoOrderIntent {
  eventId: string;
  eventTitle: string;
  marketTitle: string;
  selected: ProtoOrderOption;
  /** The other side of a binary market, for the swap control. */
  alternate?: ProtoOrderOption;
}

export interface ProtoPosition {
  id: string;
  eventId: string;
  eventTitle: string;
  marketTitle: string;
  outcomeId: string;
  label: string;
  color: string;
  avatar?: ProtoAvatar;
  contracts: number;
  avgPrice: number;
  currentPrice: number;
}

export interface ProtoRules {
  title: string;
  body: string;
}

export type ProtoFundsMode = 'add' | 'withdraw';

/** The market whose comments sheet is open. */
export interface ProtoCommentsTarget {
  eventId: string;
  title: string;
  /** Count on the card when it was tapped. */
  count: number;
}

interface PrototypeStateValue {
  isSignedIn: boolean;
  balance: number;
  positions: ProtoPosition[];
  orderIntent: ProtoOrderIntent | null;
  cashOutPosition: ProtoPosition | null;
  isGetStartedVisible: boolean;
  isKycVisible: boolean;
  isConnectedVisible: boolean;
  hasSeenIntro: boolean;
  isIntroVisible: boolean;
  fundsMode: ProtoFundsMode | null;
  rules: ProtoRules | null;
  comments: ProtoCommentsTarget | null;
  openOrder: (intent: ProtoOrderIntent) => void;
  closeOrder: () => void;
  placeOrder: (intent: ProtoOrderIntent, amountUsd: number) => void;
  openCashOut: (position: ProtoPosition) => void;
  closeCashOut: () => void;
  cashOut: (positionId: string, fraction: number) => number;
  openGetStarted: () => void;
  closeGetStarted: () => void;
  startKyc: () => void;
  completeKyc: () => void;
  closeKyc: () => void;
  finishConnect: () => void;
  openIntro: () => void;
  closeIntro: () => void;
  openFunds: (mode: ProtoFundsMode) => void;
  closeFunds: () => void;
  moveFunds: (mode: ProtoFundsMode, amount: number) => void;
  openRules: (rules: ProtoRules) => void;
  closeRules: () => void;
  openComments: (target: ProtoCommentsTarget) => void;
  closeComments: () => void;
  resetPrototype: () => void;
}

const PrototypeStateContext = createContext<PrototypeStateValue | null>(null);

const STARTING_BALANCE = 100;
/** iOS drops a modal presented while another is still dismissing. */
export const MODAL_HANDOFF_MS = 350;

export const PrototypeStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const [positions, setPositions] = useState<ProtoPosition[]>([]);
  const [orderIntent, setOrderIntent] = useState<ProtoOrderIntent | null>(null);
  const [pendingIntent, setPendingIntent] = useState<ProtoOrderIntent | null>(
    null,
  );
  const [cashOutPosition, setCashOutPosition] = useState<ProtoPosition | null>(
    null,
  );
  const [isGetStartedVisible, setIsGetStartedVisible] = useState(false);
  const [isKycVisible, setIsKycVisible] = useState(false);
  const [isConnectedVisible, setIsConnectedVisible] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [isIntroVisible, setIsIntroVisible] = useState(false);
  const [fundsMode, setFundsMode] = useState<ProtoFundsMode | null>(null);
  const [rules, setRules] = useState<ProtoRules | null>(null);
  const [comments, setComments] = useState<ProtoCommentsTarget | null>(null);

  useLiveTicker(() => {
    if (Math.random() < 0.5) return;
    setPositions((current) =>
      current.map((position) => ({
        ...position,
        currentPrice: Math.min(
          99,
          Math.max(
            1,
            position.currentPrice + Math.round((Math.random() - 0.45) * 2),
          ),
        ),
      })),
    );
  }, positions.length > 0);

  const openOrder = useCallback(
    (intent: ProtoOrderIntent) => {
      if (!isSignedIn) {
        setPendingIntent(intent);
        setIsGetStartedVisible(true);
        return;
      }
      setOrderIntent(intent);
    },
    [isSignedIn],
  );

  const placeOrder = useCallback(
    (intent: ProtoOrderIntent, amountUsd: number) => {
      const { contracts } = quoteOrder(amountUsd, intent.selected.price);
      setBalance((current) => Math.max(0, current - amountUsd));
      setPositions((current) => {
        const existing = current.find(
          (position) =>
            position.eventId === intent.eventId &&
            position.outcomeId === intent.selected.outcomeId,
        );
        if (existing) {
          const total = existing.contracts + contracts;
          return current.map((position) =>
            position === existing
              ? {
                  ...position,
                  contracts: total,
                  avgPrice: Math.round(
                    (existing.avgPrice * existing.contracts +
                      intent.selected.price * contracts) /
                      total,
                  ),
                }
              : position,
          );
        }
        return [
          {
            id: `${intent.eventId}-${intent.selected.outcomeId}-${Date.now()}`,
            eventId: intent.eventId,
            eventTitle: intent.eventTitle,
            marketTitle: intent.marketTitle,
            outcomeId: intent.selected.outcomeId,
            label: intent.selected.label,
            color: intent.selected.color,
            avatar: intent.selected.avatar,
            contracts,
            avgPrice: intent.selected.price,
            currentPrice: intent.selected.price,
          },
          ...current,
        ];
      });
    },
    [],
  );

  const cashOut = useCallback(
    (positionId: string, fraction: number) => {
      const position = positions.find(({ id }) => id === positionId);
      if (!position) return 0;
      const sold = Math.max(1, Math.round(position.contracts * fraction));
      const proceeds = (sold * position.currentPrice) / 100;
      setBalance((current) => current + proceeds);
      setPositions((current) =>
        current.flatMap((item) => {
          if (item.id !== positionId) return [item];
          const remaining = item.contracts - sold;
          return remaining > 0 ? [{ ...item, contracts: remaining }] : [];
        }),
      );
      return proceeds;
    },
    [positions],
  );

  const startKyc = useCallback(() => {
    setIsGetStartedVisible(false);
    setTimeout(() => setIsKycVisible(true), MODAL_HANDOFF_MS);
  }, []);

  const completeKyc = useCallback(() => {
    setIsKycVisible(false);
    setTimeout(() => setIsConnectedVisible(true), MODAL_HANDOFF_MS + 200);
  }, []);

  const finishConnect = useCallback(() => {
    setIsConnectedVisible(false);
    setIsSignedIn(true);
    setBalance(STARTING_BALANCE);
    if (pendingIntent) {
      const intent = pendingIntent;
      setPendingIntent(null);
      setTimeout(() => setOrderIntent(intent), MODAL_HANDOFF_MS);
    }
  }, [pendingIntent]);

  const moveFunds = useCallback((mode: ProtoFundsMode, amount: number) => {
    setBalance((current) =>
      mode === 'add' ? current + amount : Math.max(0, current - amount),
    );
  }, []);

  const resetPrototype = useCallback(() => {
    setIsSignedIn(false);
    setBalance(0);
    setPositions([]);
    setHasSeenIntro(false);
    setPendingIntent(null);
  }, []);

  const value = useMemo<PrototypeStateValue>(
    () => ({
      isSignedIn,
      balance,
      positions,
      orderIntent,
      cashOutPosition,
      isGetStartedVisible,
      isKycVisible,
      isConnectedVisible,
      hasSeenIntro,
      isIntroVisible,
      fundsMode,
      rules,
      comments,
      openOrder,
      closeOrder: () => setOrderIntent(null),
      placeOrder,
      openCashOut: setCashOutPosition,
      closeCashOut: () => setCashOutPosition(null),
      cashOut,
      openGetStarted: () => setIsGetStartedVisible(true),
      closeGetStarted: () => setIsGetStartedVisible(false),
      startKyc,
      completeKyc,
      closeKyc: () => setIsKycVisible(false),
      finishConnect,
      openIntro: () => {
        setHasSeenIntro(true);
        setIsIntroVisible(true);
      },
      closeIntro: () => setIsIntroVisible(false),
      openFunds: setFundsMode,
      closeFunds: () => setFundsMode(null),
      moveFunds,
      openRules: setRules,
      closeRules: () => setRules(null),
      openComments: setComments,
      closeComments: () => setComments(null),
      resetPrototype,
    }),
    [
      isSignedIn,
      balance,
      positions,
      orderIntent,
      cashOutPosition,
      isGetStartedVisible,
      isKycVisible,
      isConnectedVisible,
      hasSeenIntro,
      isIntroVisible,
      fundsMode,
      rules,
      comments,
      openOrder,
      placeOrder,
      cashOut,
      startKyc,
      completeKyc,
      finishConnect,
      moveFunds,
      resetPrototype,
    ],
  );

  return (
    <PrototypeStateContext.Provider value={value}>
      {children}
    </PrototypeStateContext.Provider>
  );
};

export const usePrototypeState = () => {
  const value = useContext(PrototypeStateContext);
  if (!value) {
    throw new Error('usePrototypeState must be used inside the provider');
  }
  return value;
};

/**
 * Contracts held in one outcome of an event, summed across positions. Drives
 * the small count badge on the outcome's price button, as on Kalshi and
 * Polymarket. Returns 0 when the user holds nothing.
 */
export const useHeldContracts = (eventId: string) => {
  const { positions } = usePrototypeState();
  return useCallback(
    (outcomeId: string) =>
      positions.reduce(
        (total, position) =>
          position.eventId === eventId && position.outcomeId === outcomeId
            ? total + position.contracts
            : total,
        0,
      ),
    [positions, eventId],
  );
};
