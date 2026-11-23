import { createContext, useContext, useMemo } from 'react';
import {
  getPredictDepositEnvironment,
  type PredictDepositEnvironment,
} from '../../../config/depositEnvironment';

const DepositEnvironmentContext = createContext<
  PredictDepositEnvironment | undefined
>(undefined);

/**
 * Overrides the build's deposit environment for the screen below it.
 * Component-view tests only: no production code renders it, so a running app
 * always uses the environment its build was made with.
 */
export const DepositEnvironmentOverride = DepositEnvironmentContext.Provider;

/** The build's deposit chain, USDC and transfer mode. */
export const useDepositEnvironment = (): PredictDepositEnvironment => {
  const override = useContext(DepositEnvironmentContext);
  return useMemo(() => override ?? getPredictDepositEnvironment(), [override]);
};
