import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectRecurringPriceTolerance,
  setRecurringPriceTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';
import { CUSTOM_COST_TOLERANCE_OPTION_ID } from './constants';
import { RecurringCustomPriceToleranceModal } from './RecurringCustomPriceToleranceModal';
import { RecurringDefaultPriceToleranceModal } from './RecurringDefaultPriceToleranceModal';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';

const mockDispatch = jest.fn();
const mockSelector = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

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
    navigate: mockNavigate,
  }),
}));

// The keypad is native-heavy and its behavior is covered by the shared modal
// tests; recurring wrappers only verify feature-specific state wiring.
jest.mock('../../../../Base/Keypad', () => ({
  ...jest.requireActual('../../../../Base/Keypad'),
  __esModule: true,
  default: jest.fn(() => {
    const { View } = jest.requireActual('react-native');
    return <View testID="keypad" />;
  }),
}));

describe('Recurring price tolerance modals', () => {
  function mockPriceTolerance(
    priceTolerance: string | undefined,
    defaultPriceTolerance = '3',
  ) {
    mockSelector.mockImplementation((selector) => {
      if (selector === selectRecurringPriceTolerance) {
        return priceTolerance;
      }
      if (selector === selectBridgeRecurringBuyDefaultPriceTolerance) {
        return defaultPriceTolerance;
      }
      return undefined;
    });
  }

  beforeEach(() => {
    mockPriceTolerance(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits the recurring remote default when no override is stored', () => {
    mockPriceTolerance(undefined, '2.5');
    const { getByText } = render(<RecurringDefaultPriceToleranceModal />);

    fireEvent.press(getByText(strings('bridge.submit')));

    expect(mockDispatch).toHaveBeenCalledWith(
      setRecurringPriceTolerance('2.5'),
    );
  });

  it('renders the recurring tolerance description', () => {
    const { getByText } = render(<RecurringDefaultPriceToleranceModal />);

    expect(
      getByText(
        strings('bridge.recurring.default_price_tolerance_description', {
          costTolerance: '3',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('opens the recurring custom tolerance route', () => {
    const { getByTestId } = render(<RecurringDefaultPriceToleranceModal />);

    fireEvent.press(
      getByTestId(
        SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION(
          CUSTOM_COST_TOLERANCE_OPTION_ID,
        ),
      ),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_CUSTOM_PRICE_TOLERANCE_MODAL,
    });
  });

  it('submits the stored recurring custom tolerance', () => {
    mockPriceTolerance('1.25');
    const { getByText } = render(<RecurringCustomPriceToleranceModal />);

    fireEvent.press(getByText(strings('bridge.confirm')));

    expect(mockDispatch).toHaveBeenCalledWith(
      setRecurringPriceTolerance('1.25'),
    );
  });
});
