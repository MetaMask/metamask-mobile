import { useContext } from 'react';
import { StakeContext } from '../sdk/stakeSdkProvider';

export const useStakeContext = () => {
  const context = useContext(StakeContext);
  if (!context) {
    throw new Error('useStakeContext must be used within a StakeProvider');
  }
  return context;
};
