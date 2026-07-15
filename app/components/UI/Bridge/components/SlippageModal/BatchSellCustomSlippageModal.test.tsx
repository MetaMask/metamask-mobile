import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CaipAssetType } from '@metamask/utils';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { useShouldDisableCustomSlippageConfirm } from '../../hooks/useShouldDisableCustomSlippageConfirm';
import { useSlippageStepperDescription } from '../../hooks/useSlippageStepperDescription';
import {
  selectBatchSellSlippages,
  setBatchSellTokenSlippage,
} from '../../../../../core/redux/slices/bridge';
import { BatchSellCustomSlippageModal } from './BatchSellCustomSlippageModal';

const batchSellAssetId =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
const mockDispatch = jest.fn();
const mockSelector = jest.fn();

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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../../../Base/Keypad', () => ({
  __esModule: true,
  default: jest.fn(() => {
    const { View } = jest.requireActual('react-native');
    return <View testID="keypad" />;
  }),
}));

jest.mock('../../hooks/useSlippageConfig', () => ({
  useSlippageConfig: jest.fn(),
}));

jest.mock('../../hooks/useShouldDisableCustomSlippageConfirm', () => ({
  useShouldDisableCustomSlippageConfirm: jest.fn(),
}));

jest.mock('../../hooks/useSlippageStepperDescription', () => ({
  useSlippageStepperDescription: jest.fn(),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseSlippageConfig = useSlippageConfig as jest.MockedFunction<
  typeof useSlippageConfig
>;
const mockUseShouldDisableCustomSlippageConfirm =
  useShouldDisableCustomSlippageConfirm as jest.MockedFunction<
    typeof useShouldDisableCustomSlippageConfirm
  >;
const mockUseSlippageStepperDescription =
  useSlippageStepperDescription as jest.MockedFunction<
    typeof useSlippageStepperDescription
  >;

describe('BatchSellCustomSlippageModal', () => {
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
      batchSellAssetId,
    });
    mockSelector.mockImplementation((selector) =>
      selector === selectBatchSellSlippages
        ? { [batchSellAssetId]: '3' }
        : undefined,
    );
    mockUseSlippageConfig.mockReturnValue(mockSlippageConfig);
    mockUseShouldDisableCustomSlippageConfirm.mockReturnValue(false);
    mockUseSlippageStepperDescription.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('feeds per-token Batch Sell slippage into the custom modal content', () => {
    const { getByText } = render(<BatchSellCustomSlippageModal />);

    expect(mockUseSlippageConfig).toHaveBeenCalledWith({
      sourceChainId: '0x1',
      destChainId: '0x89',
    });
    fireEvent.press(getByText('Confirm'));
    expect(mockDispatch).toHaveBeenCalledWith(
      setBatchSellTokenSlippage({
        assetId: batchSellAssetId,
        slippage: '3',
      }),
    );
  });
});
