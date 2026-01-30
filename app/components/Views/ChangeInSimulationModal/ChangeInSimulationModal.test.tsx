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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () =>
    ({ children }: { children: React.ReactElement }) => <>{children}</>,
);

const mockOnProceed = jest.fn();
const mockOnReject = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => mockUseRoute(),
  };
});

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
  });

  it('render matches snapshot', () => {
    mockUseRoute.mockReturnValue({
      params: {
        onProceed: mockOnProceed,
        onReject: mockOnReject,
      },
    });

    const { toJSON } = renderWithProvider(<ChangeInSimulationModal />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onProceed and onReject callbacks', () => {
    mockUseRoute.mockReturnValue({
      params: {
        onProceed: mockOnProceed,
        onReject: mockOnReject,
      },
    });

    const wrapper = renderWithProvider(<ChangeInSimulationModal />, {
      state: mockInitialState,
    });
    fireEvent.press(wrapper.getByTestId(PROCEED_BUTTON_TEST_ID));
    expect(mockOnProceed).toHaveBeenCalledTimes(1);

    fireEvent.press(wrapper.getByTestId(REJECT_BUTTON_TEST_ID));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });
});
