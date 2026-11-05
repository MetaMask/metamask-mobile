import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type BiometricConsentState = [
  hasBiometricConsent: boolean,
  setHasBiometricConsent: (isSelected: boolean) => void,
];

const BiometricConsentContext = createContext<BiometricConsentState | null>(
  null,
);

/**
 * Holds the idOS biometric (BPA) consent for the identity verification stack,
 * so the tick on Our verification partners survives going back to Verify your
 * identity and returning. It always starts unticked.
 */
export const BiometricConsentProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [hasBiometricConsent, setHasBiometricConsent] = useState(false);
  const value = useMemo<BiometricConsentState>(
    () => [hasBiometricConsent, setHasBiometricConsent],
    [hasBiometricConsent],
  );

  return (
    <BiometricConsentContext.Provider value={value}>
      {children}
    </BiometricConsentContext.Provider>
  );
};

/**
 * The biometric consent shared by {@link BiometricConsentProvider}, or local
 * state when rendered outside it (for example in isolation in tests).
 *
 * @returns The consent and its setter.
 */
export const useBiometricConsent = (): BiometricConsentState => {
  const sharedConsent = useContext(BiometricConsentContext);
  const localConsent = useState(false);
  return sharedConsent ?? localConsent;
};
