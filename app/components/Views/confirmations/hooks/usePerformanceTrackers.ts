import { useEffect } from 'react';
import { endConfirmationStartupSpan } from '../../../../core/Performance/confirmations';

const usePerformanceTrackers = () => {
  useEffect(() => {
    endConfirmationStartupSpan();
  }, []);
};

export default usePerformanceTrackers;
