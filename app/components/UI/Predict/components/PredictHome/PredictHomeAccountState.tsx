import React, { forwardRef } from 'react';
import PredictPositionsHeader, {
  PredictPositionsHeaderHandle,
} from '../PredictPositionsHeader';

interface PredictHomeAccountStateProps {
  onError?: (error: string | null) => void;
}

const PredictHomeAccountState = forwardRef<
  PredictPositionsHeaderHandle,
  PredictHomeAccountStateProps
>(({ onError }, ref) => <PredictPositionsHeader ref={ref} onError={onError} />);

PredictHomeAccountState.displayName = 'PredictHomeAccountState';

export default PredictHomeAccountState;
