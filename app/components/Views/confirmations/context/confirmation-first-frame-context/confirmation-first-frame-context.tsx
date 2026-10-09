import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface ConfirmationFirstFrame {
  /** True once the confirmation shell has had a frame to present. */
  isFirstFrameComplete: boolean;
}

const ConfirmationFirstFrameContext = createContext<
  ConfirmationFirstFrame | undefined
>(undefined);

/**
 * Lets consumers defer expensive initialization until the confirmation shell
 * has presented its first frame. Keyed by transaction so readiness cannot
 * leak to a replacement transaction.
 */
export function ConfirmationFirstFrameProvider({
  children,
  enabled,
  transactionId,
}: {
  children: React.ReactNode;
  enabled: boolean;
  transactionId?: string;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <FirstFrameProvider key={transactionId}>{children}</FirstFrameProvider>
  );
}

/**
 * Returns `undefined` when first-frame deferral is not enabled, in which case
 * consumers should render immediately.
 */
export function useConfirmationFirstFrame() {
  return useContext(ConfirmationFirstFrameContext);
}

function FirstFrameProvider({ children }: { children: React.ReactNode }) {
  const [isFirstFrameComplete, setIsFirstFrameComplete] = useState(false);

  useEffect(() => {
    // rAF runs before a frame is presented, so yield through two callbacks to
    // guarantee the shell frame has been shown before deferred work mounts.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        setIsFirstFrameComplete(true);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const value = useMemo(
    () => ({ isFirstFrameComplete }),
    [isFirstFrameComplete],
  );

  return (
    <ConfirmationFirstFrameContext.Provider value={value}>
      {children}
    </ConfirmationFirstFrameContext.Provider>
  );
}
