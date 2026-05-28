import React, { createContext, useContext, type ReactNode } from 'react';
import { InputCurrencyMode } from '@metamask/bridge-controller';

const BridgeInputCurrencyModeContext = createContext<InputCurrencyMode>(
  InputCurrencyMode.CRYPTO,
);

export const BridgeInputCurrencyModeProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: InputCurrencyMode;
}) => (
  <BridgeInputCurrencyModeContext.Provider value={value}>
    {children}
  </BridgeInputCurrencyModeContext.Provider>
);

export const useBridgeInputCurrencyMode = () =>
  useContext(BridgeInputCurrencyModeContext);
