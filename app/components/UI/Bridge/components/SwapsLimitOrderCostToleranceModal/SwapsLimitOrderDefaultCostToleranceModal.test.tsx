import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  selectLimitOrderCostTolerance,
  setLimitOrderCostTolerance,
} from '../../../../../core/redux/slices/bridge';
import { SwapsLimitOrderDefaultCostToleranceModal } from './SwapsLimitOrderDefaultCostToleranceModal';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';
import { CUSTOM_COST_TOLERANCE_OPTION_ID } from './constants';

const mockDispatch = jest.fn();
const mockSelector = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        (props: { children: unknown; testID?: string }, _ref: unknown) => (
          <View testID={props.testID}>{props.children as React.ReactNode}</View>
        ),
      ),
    };
  },
);

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    mockSelector(selector),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

describe('SwapsLimitOrderDefaultCostToleranceModal', () => {
  const mockCostTolerance = (costTolerance: string | undefined) =>
    mockSelector.mockImplementation((selector) =>
      selector === selectLimitOrderCostTolerance ? costTolerance : undefined,
    );

  beforeEach(() => {
    mockCostTolerance(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the cost tolerance title and description', () => {
    const { getByText, getByTestId } = render(
      <SwapsLimitOrderDefaultCostToleranceModal />,
    );

    expect(getByText(strings('bridge.cost_tolerance'))).toBeOnTheScreen();
    expect(
      getByText(
        strings('bridge.default_cost_tolerance_description', {
          costTolerance: '2',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SwapsLimitOrderCostToleranceModalSelectorsIDs.DEFAULT_SHEET),
    ).toBeOnTheScreen();
  });

  it('renders the fixed cost tolerance options plus a custom option', () => {
    const { getByTestId, getByText } = render(
      <SwapsLimitOrderDefaultCostToleranceModal />,
    );

    ['0.5', '2', '3'].forEach((value) => {
      expect(
        getByTestId(
          SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION(value),
        ),
      ).toBeOnTheScreen();
      expect(getByText(`${value}%`)).toBeOnTheScreen();
    });
    expect(
      getByTestId(
        SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION(
          CUSTOM_COST_TOLERANCE_OPTION_ID,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('navigates to the custom cost tolerance modal when custom is pressed', () => {
    const { getByTestId } = render(
      <SwapsLimitOrderDefaultCostToleranceModal />,
    );

    fireEvent.press(
      getByTestId(
        SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION(
          CUSTOM_COST_TOLERANCE_OPTION_ID,
        ),
      ),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen:
        Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_CUSTOM_COST_TOLERANCE_MODAL,
    });
  });

  it('preselects 2% when no cost tolerance is stored', () => {
    const { getByText } = render(<SwapsLimitOrderDefaultCostToleranceModal />);

    fireEvent.press(getByText(strings('bridge.submit')));

    expect(mockDispatch).toHaveBeenCalledWith(setLimitOrderCostTolerance('2'));
  });

  it('dispatches the selected value when an option is submitted', () => {
    const { getByTestId, getByText } = render(
      <SwapsLimitOrderDefaultCostToleranceModal />,
    );

    fireEvent.press(
      getByTestId(SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION('0.5')),
    );
    fireEvent.press(getByText(strings('bridge.submit')));

    expect(mockDispatch).toHaveBeenCalledWith(
      setLimitOrderCostTolerance('0.5'),
    );
  });

  it('initializes the selection from the stored cost tolerance', () => {
    mockCostTolerance('3');

    const { getByText } = render(<SwapsLimitOrderDefaultCostToleranceModal />);

    fireEvent.press(getByText(strings('bridge.submit')));

    expect(mockDispatch).toHaveBeenCalledWith(setLimitOrderCostTolerance('3'));
  });

  it('keeps a stored custom value that is not one of the options', () => {
    mockCostTolerance('1.25');

    const { getByText } = render(<SwapsLimitOrderDefaultCostToleranceModal />);

    fireEvent.press(getByText(strings('bridge.submit')));

    expect(mockDispatch).toHaveBeenCalledWith(
      setLimitOrderCostTolerance('1.25'),
    );
  });
});
