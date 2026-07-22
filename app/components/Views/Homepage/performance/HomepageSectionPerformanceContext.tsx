import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

export type HomepageSectionPerformanceSessionTrigger = 'app_open' | 'unlock';

export interface HomepageSectionPerformanceSession {
  id: string;
  startTime: number;
  trigger: HomepageSectionPerformanceSessionTrigger;
}

interface HomepageSectionPerformanceContextValue {
  activeSession: HomepageSectionPerformanceSession | null;
  claimPendingSession: () => HomepageSectionPerformanceSession | null;
  releaseSession: (sessionId: string) => void;
}

const HomepageSectionPerformanceContext =
  createContext<HomepageSectionPerformanceContextValue>({
    activeSession: null,
    claimPendingSession: () => null,
    releaseSession: () => undefined,
  });

const now = () => performance.timeOrigin + performance.now();

export const HomepageSectionPerformanceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const previousIsUnlockedRef = useRef(isUnlocked);
  const lastAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingSessionRef = useRef<HomepageSectionPerformanceSession | null>(
    null,
  );
  const hasInitializedPendingSessionRef = useRef(false);
  if (!hasInitializedPendingSessionRef.current) {
    pendingSessionRef.current =
      isUnlocked && AppState.currentState !== 'background'
        ? {
            id: uuidv4(),
            startTime: now(),
            trigger: 'app_open' as const,
          }
        : null;
    hasInitializedPendingSessionRef.current = true;
  }
  const [, setPendingSessionVersion] = useState(0);
  const [activeSession, setActiveSession] =
    useState<HomepageSectionPerformanceSession | null>(null);

  const armSession = useCallback(
    (trigger: HomepageSectionPerformanceSessionTrigger) => {
      pendingSessionRef.current = {
        id: uuidv4(),
        startTime: now(),
        trigger,
      };
      setPendingSessionVersion((version) => version + 1);
      setActiveSession(null);
    },
    [],
  );

  useEffect(() => {
    const previousIsUnlocked = previousIsUnlockedRef.current;
    previousIsUnlockedRef.current = isUnlocked;

    if (!previousIsUnlocked && isUnlocked) {
      armSession('unlock');
    }
  }, [armSession, isUnlocked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = lastAppStateRef.current;

      if (nextAppState === 'active' && previousAppState === 'background') {
        if (previousIsUnlockedRef.current) {
          armSession('app_open');
        }
      }

      if (!(nextAppState === 'inactive' && previousAppState === 'background')) {
        lastAppStateRef.current = nextAppState;
      }
    });

    return () => subscription.remove();
  }, [armSession]);

  const claimPendingSession = useCallback(() => {
    const claimedSession = pendingSessionRef.current;
    pendingSessionRef.current = null;
    setPendingSessionVersion((version) => version + 1);

    if (claimedSession) {
      setActiveSession(claimedSession);
    }

    return claimedSession;
  }, []);

  const releaseSession = useCallback((sessionId: string) => {
    setActiveSession((currentActiveSession) =>
      currentActiveSession?.id === sessionId ? null : currentActiveSession,
    );
  }, []);

  const value = useMemo(
    () => ({
      activeSession,
      claimPendingSession,
      releaseSession,
    }),
    [activeSession, claimPendingSession, releaseSession],
  );

  return (
    <HomepageSectionPerformanceContext.Provider value={value}>
      {children}
    </HomepageSectionPerformanceContext.Provider>
  );
};

export const useHomepageSectionPerformanceContext = () =>
  useContext(HomepageSectionPerformanceContext);
