import React, { createContext, useContext, ReactNode } from 'react';
import { PredictEntryPoint } from '../types/navigation';

const PredictEntryPointContext = createContext<PredictEntryPoint | undefined>(
  undefined,
);

interface PredictEntryPointProviderProps {
  entryPoint: PredictEntryPoint;
  children: ReactNode;
}

export const PredictEntryPointProvider: React.FC<
  PredictEntryPointProviderProps
> = ({ entryPoint, children }) => (
  <PredictEntryPointContext.Provider value={entryPoint}>
    {children}
  </PredictEntryPointContext.Provider>
);

export const usePredictEntryPoint = (): PredictEntryPoint | undefined =>
  useContext(PredictEntryPointContext);
