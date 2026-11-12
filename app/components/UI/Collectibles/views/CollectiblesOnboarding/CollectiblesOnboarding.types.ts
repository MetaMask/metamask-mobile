export interface CollectiblesOnboardingProps {
  /** Records completion and opens the Collectibles overview. */
  onComplete: () => void;
  /** Returns to the screen from which onboarding was opened. */
  onClose: () => void;
  /** Stops decorative animation when the screen loses focus. */
  isActive?: boolean;
}
