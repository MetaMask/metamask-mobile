import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useGetSlippageOptions } from '../../hooks/useGetSlippageOptions';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { SwapDefaultSlippageModal } from './SwapDefaultSlippageModal';

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
        (props: { children: unknown }, _ref: unknown) => (
          <View testID="bottom-sheet">{props.children as React.ReactNode}</View>
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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useGetSlippageOptions', () => ({
  useGetSlippageOptions: jest.fn(),
}));

jest.mock('../../hooks/useSlippageConfig', () => ({
  useSlippageConfig: jest.fn(),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseGetSlippageOptions = useGetSlippageOptions as jest.MockedFunction<
  typeof useGetSlippageOptions
>;
const mockUseSlippageConfig = useSlippageConfig as jest.MockedFunction<
  typeof useSlippageConfig
>;

describe('SwapDefaultSlippageModal', () => {
  const mockSlippageConfig = {
    input_step: 0.1,
    max_amount: 100,
    min_amount: 0,
    input_max_decimals: 2,
    lower_allowed_slippage_threshold: null,
    lower_suggested_slippage_threshold: null,
    upper_suggested_slippage_threshold: null,
    upper_allowed_slippage_threshold: null,
    default_slippage_options: ['auto', '0.5', '2', '3'],
    has_custom_slippage_option: true,
  };

  beforeEach(() => {
    mockUseParams.mockReturnValue({
      sourceChainId: '0x1',
      destChainId: '0x89',
    });
    mockSelector.mockImplementation((selector) =>
      selector === selectSlippage ? '2' : undefined,
    );
    mockUseSlippageConfig.mockReturnValue(mockSlippageConfig);
    mockUseGetSlippageOptions.mockImplementation(
      ({ onCustomOptionPress, onDefaultOptionPress, slippage }) => [
        {
          id: 'current',
          label: `${slippage ?? 'auto'}%`,
          selected: true,
          onPress: jest.fn(),
        },
        {
          id: 'three',
          label: '3%',
          selected: false,
          onPress: onDefaultOptionPress('3'),
        },
        {
          id: 'custom',
          label: 'Custom',
          selected: false,
          onPress: onCustomOptionPress ?? jest.fn(),
        },
      ],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('feeds global swap slippage into the default modal content', () => {
    render(<SwapDefaultSlippageModal />);

    expect(mockUseSlippageConfig).toHaveBeenCalledWith({
      sourceChainId: '0x1',
      destChainId: '0x89',
    });
    expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        slippage: '2',
      }),
    );
  });

  it('opens the normal custom slippage route', () => {
    const { getByText } = render(<SwapDefaultSlippageModal />);

    fireEvent.press(getByText('Custom'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_CUSTOM_SLIPPAGE_MODAL,
      params: {
        sourceChainId: '0x1',
        destChainId: '0x89',
      },
    });
  });

  it('dispatches global slippage updates', () => {
    const { getByText } = render(<SwapDefaultSlippageModal />);

    fireEvent.press(getByText('3%'));
    fireEvent.press(getByText('Submit'));

    expect(mockDispatch).toHaveBeenCalledWith(setSlippage('3'));
  });
});
