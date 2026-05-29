import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictClaimInfo } from './predict-claim-info';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');

jest.mock('../../../hooks/ui/useNavbar', () => ({
  useModalNavbar: jest.fn(),
}));

jest.mock('../../../hooks/metrics/usePredictClaimConfirmationMetrics', () => ({
  usePredictClaimConfirmationMetrics: jest.fn(),
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: () => ({
    onReject: jest.fn(),
  }),
}));

jest.mock('../../predict-confirmations/predict-claim-amount', () => ({
  PredictClaimAmount: () => null,
  PredictClaimAmountSkeleton: () => null,
}));

jest.mock('../../predict-confirmations/predict-claim-background', () => ({
  PredictClaimBackground: () => null,
}));

jest.mock(
  '../../../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: () => null,
    ButtonIconSizes: {
      Lg: 'lg',
    },
  }),
);

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      backButton: {},
    },
  }),
}));

describe('PredictClaimInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the confirmation when dismissed with a back gesture', () => {
    render(<PredictClaimInfo />);

    expect(useClearConfirmationOnBackSwipe).toHaveBeenCalledTimes(1);
  });
});
