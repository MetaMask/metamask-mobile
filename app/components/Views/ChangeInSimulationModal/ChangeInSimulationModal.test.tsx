import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import ChangeInSimulationModal, {
  PROCEED_BUTTON_TEST_ID,
  REJECT_BUTTON_TEST_ID,
} from './ChangeInSimulationModal';
import { RootState } from '../../../reducers';

let mockRouteParams: { onProceed: jest.Mock; onReject: jest.Mock } = {
  onProceed: jest.fn(),
  onReject: jest.fn(),
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () =>
    ({ children }: { children: React.ReactElement }) => <>{children}</>,
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('ChangeInSimulationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      onProceed: jest.fn(),
      onReject: jest.fn(),
    };
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<ChangeInSimulationModal />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onProceed and onReject callbacks', () => {
    const mockOnReject = jest.fn();
    const mockOnProceed = jest.fn();
    mockRouteParams = { onProceed: mockOnProceed, onReject: mockOnReject };
    const wrapper = renderWithProvider(<ChangeInSimulationModal />, {
      state: mockInitialState,
    });
    fireEvent.press(wrapper.getByTestId(PROCEED_BUTTON_TEST_ID));
    expect(mockOnProceed).toHaveBeenCalledTimes(1);

    fireEvent.press(wrapper.getByTestId(REJECT_BUTTON_TEST_ID));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });
});
