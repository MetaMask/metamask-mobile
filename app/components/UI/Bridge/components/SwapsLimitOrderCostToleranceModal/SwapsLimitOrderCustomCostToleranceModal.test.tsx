import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Keypad, { Keys } from '../../../../Base/Keypad';
import {
  selectLimitOrderCostTolerance,
  setLimitOrderCostTolerance,
} from '../../../../../core/redux/slices/bridge';
import { SwapsLimitOrderCustomCostToleranceModal } from './SwapsLimitOrderCustomCostToleranceModal';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';

const mockDispatch = jest.fn();
const mockSelector = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    __esModule: true,
    BottomSheet: ReactModule.forwardRef(
      (props: { children: unknown; testID?: string }, _ref: unknown) => (
        <View testID={props.testID}>{props.children as React.ReactNode}</View>
      ),
    ),
  };
});

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    mockSelector(selector),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// The keypad itself is not under test, but its `Keys` enum is used by the
// cursor hook, so the real module is kept except for the rendered component.
jest.mock('../../../../Base/Keypad', () => ({
  ...jest.requireActual('../../../../Base/Keypad'),
  __esModule: true,
  default: jest.fn(() => {
    const { View } = jest.requireActual('react-native');
    return <View testID="keypad" />;
  }),
}));

describe('SwapsLimitOrderCustomCostToleranceModal', () => {
  const mockCostTolerance = (costTolerance: string | undefined) =>
    mockSelector.mockImplementation((selector) =>
      selector === selectLimitOrderCostTolerance ? costTolerance : undefined,
    );

  beforeEach(() => {
    mockCostTolerance('2');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the cost tolerance title with the stepper and keypad', () => {
    const { getByText, getByTestId } = render(
      <SwapsLimitOrderCustomCostToleranceModal />,
    );

    expect(getByText(strings('bridge.cost_tolerance'))).toBeOnTheScreen();
    expect(getByTestId('keypad')).toBeOnTheScreen();
    expect(getByTestId('input-stepper-input')).toBeOnTheScreen();
    expect(
      getByTestId(SwapsLimitOrderCostToleranceModalSelectorsIDs.CUSTOM_SHEET),
    ).toBeOnTheScreen();
  });

  it('renders no description for a cost tolerance within bounds', () => {
    const { queryByTestId } = render(
      <SwapsLimitOrderCustomCostToleranceModal />,
    );

    expect(queryByTestId('input-stepper-description-row')).toBeNull();
  });

  it('shows the lower bound error for a cost tolerance of 0%', () => {
    mockCostTolerance('0');

    const { getByText } = render(<SwapsLimitOrderCustomCostToleranceModal />);

    expect(
      getByText(
        strings('bridge.exceeding_lower_cost_tolerance_error', { value: 0 }),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the upper bound error for a cost tolerance of 100%', () => {
    mockCostTolerance('100');

    const { getByText } = render(<SwapsLimitOrderCustomCostToleranceModal />);

    expect(
      getByText(
        strings('bridge.exceeding_upper_cost_tolerance_error', { value: 100 }),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the upper bound error when the keypad input would exceed 100%', () => {
    const { getByText, queryByTestId } = render(
      <SwapsLimitOrderCustomCostToleranceModal />,
    );

    expect(queryByTestId('input-stepper-description-row')).toBeNull();

    act(() => {
      jest.mocked(Keypad).mock.calls.at(-1)?.[0].onChange?.({
        value: '2000',
        valueAsNumber: 2000,
        pressedKey: Keys.Digit0,
      });
    });

    expect(
      getByText(
        strings('bridge.exceeding_upper_cost_tolerance_error', { value: 100 }),
      ),
    ).toBeOnTheScreen();
  });

  it('dispatches the stored cost tolerance when confirmed without edits', () => {
    const { getByText } = render(<SwapsLimitOrderCustomCostToleranceModal />);

    fireEvent.press(getByText(strings('bridge.confirm')));

    expect(mockDispatch).toHaveBeenCalledWith(setLimitOrderCostTolerance('2'));
  });

  it('starts from 2% when no cost tolerance is stored', () => {
    mockCostTolerance(undefined);

    const { getByText } = render(<SwapsLimitOrderCustomCostToleranceModal />);

    fireEvent.press(getByText(strings('bridge.confirm')));

    expect(mockDispatch).toHaveBeenCalledWith(setLimitOrderCostTolerance('2'));
  });

  it('dispatches the incremented value after pressing the stepper plus button', () => {
    const { getByTestId, getByText } = render(
      <SwapsLimitOrderCustomCostToleranceModal />,
    );

    fireEvent.press(getByTestId('input-stepper-plus-button'));
    fireEvent.press(getByText(strings('bridge.confirm')));

    expect(mockDispatch).toHaveBeenCalledWith(
      setLimitOrderCostTolerance('2.1'),
    );
  });

  it('dispatches the decremented value after pressing the stepper minus button', () => {
    const { getByTestId, getByText } = render(
      <SwapsLimitOrderCustomCostToleranceModal />,
    );

    fireEvent.press(getByTestId('input-stepper-minus-button'));
    fireEvent.press(getByText(strings('bridge.confirm')));

    expect(mockDispatch).toHaveBeenCalledWith(
      setLimitOrderCostTolerance('1.9'),
    );
  });

  it.each(['0', '100', '150'])(
    'disables confirm for a cost tolerance of %s%',
    (storedCostTolerance) => {
      mockCostTolerance(storedCostTolerance);

      const { getByRole } = render(<SwapsLimitOrderCustomCostToleranceModal />);
      const confirmButton = getByRole('button', {
        name: strings('bridge.confirm'),
      });

      expect(confirmButton.props.accessibilityState?.disabled).toBe(true);

      fireEvent.press(confirmButton);

      expect(mockDispatch).not.toHaveBeenCalled();
    },
  );

  it('keeps confirm enabled just below 100%', () => {
    mockCostTolerance('99.99');

    const { getByRole } = render(<SwapsLimitOrderCustomCostToleranceModal />);
    const confirmButton = getByRole('button', {
      name: strings('bridge.confirm'),
    });

    expect(confirmButton.props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(confirmButton);

    expect(mockDispatch).toHaveBeenCalledWith(
      setLimitOrderCostTolerance('99.99'),
    );
  });
});
