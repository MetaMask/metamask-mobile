export interface GachaOnboardingProps {
  /** Current Solana USDC balance in base units; updates while onboarding is open. */
  balance: bigint;
  /** Opens Quick Buy above onboarding without completing it. */
  onFund: () => void;
  /** Records completion and opens the pack list. */
  onComplete: () => void;
  /** Returns to the screen from which onboarding was opened. */
  onClose: () => void;
  /** Prevents opening a second funding flow. */
  isFunding?: boolean;
}
