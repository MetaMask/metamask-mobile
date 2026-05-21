import React from 'react';
import { render } from '@testing-library/react-native';
import { useModalNavbar } from '../../../hooks/ui/useNavbar';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { usePredictClaimConfirmationMetrics } from '../../../hooks/metrics/usePredictClaimConfirmationMetrics';
import { PredictClaimInfo } from './predict-claim-info';

jest.mock('../../../hooks/ui/useNavbar', () => ({
  useModalNavbar: jest.fn(),
}));

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../hooks/metrics/usePredictClaimConfirmationMetrics', () => ({
  usePredictClaimConfirmationMetrics: jest.fn(),
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(() => ({
    onReject: jest.fn(),
  })),
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
      Lg: 'Lg',
    },
  }),
);

jest.mock('../../../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Close: 'Close',
  },
}));

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

  it('clears pending confirmation when leaving through native navigation', () => {
    render(<PredictClaimInfo />);

    expect(useModalNavbar).toHaveBeenCalled();
    expect(useClearConfirmationOnBackSwipe).toHaveBeenCalled();
    expect(usePredictClaimConfirmationMetrics).toHaveBeenCalled();
  });
});
