import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictClaimInfo } from './predict-claim-info';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import Engine from '../../../../../../core/Engine';

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

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearPendingClaim: jest.fn(),
    },
  },
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
    (useClearConfirmationOnBackSwipe as jest.Mock).mockReturnValue(jest.fn());
  });

  it('clears the confirmation when dismissed with a back gesture', () => {
    render(<PredictClaimInfo />);

    expect(useClearConfirmationOnBackSwipe).toHaveBeenCalledTimes(1);
    expect(useClearConfirmationOnBackSwipe).toHaveBeenCalledWith({
      rejectOnBeforeRemove: true,
      skipNavigationOnGestureEnd: false,
      rejectOnBeforeRemoveWithoutGesture: true,
      onBeforeReject: expect.any(Function),
    });
    const options = (useClearConfirmationOnBackSwipe as jest.Mock).mock
      .calls[0][0];

    options.onBeforeReject();

    expect(
      Engine.context.PredictController.clearPendingClaim,
    ).toHaveBeenCalledTimes(1);
  });
});
