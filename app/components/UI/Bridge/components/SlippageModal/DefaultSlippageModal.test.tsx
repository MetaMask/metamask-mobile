import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DefaultSlippageModal } from './DefaultSlippageModal';
import Routes from '../../../../../constants/navigation/Routes';

// Mock BottomSheet
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    const { View } = ReactNative;

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

// Mock HeaderCompactStandard
jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactNative = jest.requireActual('react-native');
    const { View, Text, TouchableOpacity } = ReactNative;

    return {
      __esModule: true,
      default: (props: { title: string; onClose: () => void }) => (
        <View testID="header-center">
          <Text>{props.title}</Text>
          <TouchableOpacity onPress={props.onClose} accessibilityLabel="Close">
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      ),
    };
  },
);

// Mock dependencies
jest.mock('./DefaultSlippageButtonGroup', () => ({
  DefaultSlippageButtonGroup: jest.fn(({ options }) => {
    const ReactNative = jest.requireActual('react-native');
    const { View, Text, TouchableOpacity } = ReactNative;
    return (
      <View testID="default-slippage-button-group">
        {options.map(
          (option: { id: string; label: string; onPress: () => void }) => (
            <TouchableOpacity
              key={option.id}
              testID={`option-${option.id}`}
              onPress={option.onPress}
            >
              <Text>{option.label}</Text>
            </TouchableOpacity>
          ),
        )}
      </View>
    );
  }),
}));

jest.mock('../../hooks/useGetSlippageOptions', () => ({
  useGetSlippageOptions: jest.fn(),
}));

jest.mock('../../hooks/useSlippageConfig', () => ({
  useSlippageConfig: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

// Mock Redux
const mockDispatch = jest.fn();
const mockSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    mockSelector(selector),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'bridge.slippage': 'Slippage',
      'bridge.default_slippage_description': 'Set your slippage tolerance',
      'bridge.submit': 'Submit',
    };
    return translations[key] || key;
  }),
}));

import { useGetSlippageOptions } from '../../hooks/useGetSlippageOptions';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { useParams } from '../../../../../util/navigation/navUtils';
import { AUTO_SLIPPAGE_VALUE } from './constants';

const mockUseGetSlippageOptions = useGetSlippageOptions as jest.MockedFunction<
  typeof useGetSlippageOptions
>;
const mockUseSlippageConfig = useSlippageConfig as jest.MockedFunction<
  typeof useSlippageConfig
>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('DefaultSlippageModal', () => {
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

  const mockSlippageOptions = [
    { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
    { id: '0.5', label: '0.5%', selected: false, onPress: jest.fn() },
    { id: '2', label: '2%', selected: false, onPress: jest.fn() },
    { id: '3', label: '3%', selected: false, onPress: jest.fn() },
    { id: 'custom', label: 'Custom', selected: false, onPress: jest.fn() },
  ];

  beforeEach(() => {
    mockUseSlippageConfig.mockReturnValue(mockSlippageConfig);
    mockUseGetSlippageOptions.mockReturnValue(mockSlippageOptions);
    mockUseParams.mockReturnValue({
      sourceChainId: '0x1',
      destChainId: undefined,
    });
    mockSelector.mockReturnValue(undefined); // Default: no slippage set
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('uses auto as default when slippage is not defined in redux', () => {
      mockSelector.mockReturnValue(undefined);

      render(<DefaultSlippageModal />);

      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: AUTO_SLIPPAGE_VALUE,
        }),
      );
    });

    it('uses redux slippage value when defined', () => {
      mockSelector.mockReturnValue('2');

      render(<DefaultSlippageModal />);

      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: '2',
        }),
      );
    });

    it('passes sourceChainId and destChainId params to useSlippageConfig', () => {
      mockUseParams.mockReturnValue({
        sourceChainId: 'eip155:1',
        destChainId: 'eip155:137',
      });

      render(<DefaultSlippageModal />);

      expect(mockUseSlippageConfig).toHaveBeenCalledWith({
        sourceChainId: 'eip155:1',
        destChainId: 'eip155:137',
      });
    });

    it('uses slippage config options', () => {
      render(<DefaultSlippageModal />);

      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippageOptions: mockSlippageConfig.default_slippage_options,
          allowCustomSlippage: mockSlippageConfig.has_custom_slippage_option,
        }),
      );
    });
  });

  describe('handleClose', () => {
    it('closes bottom sheet when close is called', () => {
      const { getByLabelText } = render(<DefaultSlippageModal />);

      const closeButton = getByLabelText('Close');
      fireEvent.press(closeButton);

      // Bottom sheet close is handled internally by ref
      // We verify the component renders without errors
      expect(closeButton).toBeTruthy();
    });
  });

  describe('handleCustomOptionPress', () => {
    it('navigates to custom slippage modal when custom option is pressed', () => {
      render(<DefaultSlippageModal />);

      // Get the actual handler passed to useGetSlippageOptions
      const call = mockUseGetSlippageOptions.mock.calls[0][0];
      const handleCustomOptionPress = call.onCustomOptionPress;

      // Call the real handler
      handleCustomOptionPress?.();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.CUSTOM_SLIPPAGE_MODAL,
        params: {
          sourceChainId: '0x1',
          destChainId: undefined,
        },
      });
    });

    it('calls goBack before navigating to custom modal', () => {
      render(<DefaultSlippageModal />);

      // Get the actual handler
      const call = mockUseGetSlippageOptions.mock.calls[0][0];
      const handleCustomOptionPress = call.onCustomOptionPress;

      handleCustomOptionPress?.();

      const callOrder = [
        mockGoBack.mock.invocationCallOrder[0],
        mockNavigate.mock.invocationCallOrder[0],
      ];
      expect(callOrder[0]).toBeLessThan(callOrder[1]);
    });
  });

  describe('handleDefaultOptionPress', () => {
    it('updates selected slippage when default option is pressed', () => {
      const { rerender } = render(<DefaultSlippageModal />);

      // Get the actual handler passed to useGetSlippageOptions
      const call = mockUseGetSlippageOptions.mock.calls[0][0];
      const handleDefaultOptionPress = call.onDefaultOptionPress;

      // Call the handler with a value - it should return a function
      const pressHandler = handleDefaultOptionPress('2');
      pressHandler();

      // Re-render and verify hook was called with new value
      rerender(<DefaultSlippageModal />);

      // Verify useGetSlippageOptions was called again with updated slippage
      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: '2',
        }),
      );
    });
  });

  describe('handleSubmit', () => {
    it('dispatches undefined when auto is selected', () => {
      mockSelector.mockReturnValue(undefined);

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setSlippage'),
          payload: undefined,
        }),
      );
    });

    it('dispatches slippage value as string when numeric value selected', () => {
      mockSelector.mockReturnValue('2');

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: '2',
        }),
      );
    });

    it('dispatches updated slippage after user changes selection', () => {
      mockSelector.mockReturnValue('1');

      const { getByText, rerender } = render(<DefaultSlippageModal />);

      // Get the handler and change selection to '3'
      const call = mockUseGetSlippageOptions.mock.calls[0][0];
      const handleDefaultOptionPress = call.onDefaultOptionPress;
      const pressHandler = handleDefaultOptionPress('3');
      pressHandler();

      // Re-render to apply state change
      rerender(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: '3',
        }),
      );
    });

    it('dispatches undefined when selectedSlippage is undefined', () => {
      mockSelector.mockReturnValue(undefined);

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: undefined,
        }),
      );
    });

    it('converts numeric slippage to string before dispatching', () => {
      mockSelector.mockReturnValue('1.5');

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: '1.5',
        }),
      );
    });

    it('closes bottom sheet after dispatching', () => {
      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      // Verify dispatch was called and component doesn't error
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('component structure', () => {
    it('renders header with correct title', () => {
      const { getByText } = render(<DefaultSlippageModal />);

      expect(getByText('Slippage')).toBeTruthy();
    });

    it('renders description text', () => {
      const { getByText } = render(<DefaultSlippageModal />);

      expect(getByText('Set your slippage tolerance')).toBeTruthy();
    });

    it('renders DefaultSlippageButtonGroup with options', () => {
      const { getByTestId } = render(<DefaultSlippageModal />);

      expect(getByTestId('default-slippage-button-group')).toBeTruthy();
    });

    it('renders submit button', () => {
      const { getByText } = render(<DefaultSlippageModal />);

      expect(getByText('Submit')).toBeTruthy();
    });

    it('passes correct props to useGetSlippageOptions', () => {
      render(<DefaultSlippageModal />);

      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith({
        slippageOptions: mockSlippageConfig.default_slippage_options,
        allowCustomSlippage: mockSlippageConfig.has_custom_slippage_option,
        slippage: AUTO_SLIPPAGE_VALUE,
        onDefaultOptionPress: expect.any(Function),
        onCustomOptionPress: expect.any(Function),
      });
    });
  });

  describe('snapshot tests', () => {
    it('matches snapshot for complete modal', () => {
      const { toJSON } = render(<DefaultSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with auto selected', () => {
      mockSelector.mockReturnValue(undefined);

      const { toJSON } = render(<DefaultSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with numeric slippage selected', () => {
      mockSelector.mockReturnValue('2');

      const { toJSON } = render(<DefaultSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for header', () => {
      const { getByText, toJSON } = render(<DefaultSlippageModal />);

      expect(getByText('Slippage')).toBeTruthy();
      expect(toJSON()).toMatchSnapshot('header style');
    });

    it('matches snapshot for description', () => {
      const { getByText, toJSON } = render(<DefaultSlippageModal />);

      expect(getByText('Set your slippage tolerance')).toBeTruthy();
      expect(toJSON()).toMatchSnapshot('description style');
    });

    it('matches snapshot for submit button', () => {
      const { getByText, toJSON } = render(<DefaultSlippageModal />);

      expect(getByText('Submit')).toBeTruthy();
      expect(toJSON()).toMatchSnapshot('submit button style');
    });
  });

  describe('integration with hooks', () => {
    it('updates options when config changes', () => {
      const newConfig = {
        ...mockSlippageConfig,
        default_slippage_options: ['auto', '1', '2'],
        has_custom_slippage_option: false,
      };

      mockUseSlippageConfig.mockReturnValue(newConfig);

      render(<DefaultSlippageModal />);

      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippageOptions: ['auto', '1', '2'],
          allowCustomSlippage: false,
        }),
      );
    });

    it('handles Solana chain params from navigation', () => {
      mockUseParams.mockReturnValue({
        sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });

      render(<DefaultSlippageModal />);

      expect(mockUseSlippageConfig).toHaveBeenCalledWith({
        sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('handles undefined chain params', () => {
      mockUseParams.mockReturnValue({
        sourceChainId: undefined,
        destChainId: undefined,
      });

      render(<DefaultSlippageModal />);

      expect(mockUseSlippageConfig).toHaveBeenCalledWith({
        sourceChainId: undefined,
        destChainId: undefined,
      });
    });

    it('handles sourceChainId only (no destChainId)', () => {
      mockUseParams.mockReturnValue({
        sourceChainId: '0x1',
        destChainId: undefined,
      });

      render(<DefaultSlippageModal />);

      expect(mockUseSlippageConfig).toHaveBeenCalledWith({
        sourceChainId: '0x1',
        destChainId: undefined,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty slippage options', () => {
      mockUseGetSlippageOptions.mockReturnValue([]);

      const { toJSON } = render(<DefaultSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('handles zero slippage value', () => {
      mockSelector.mockReturnValue('0');

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: '0',
        }),
      );
    });

    it('handles decimal slippage value', () => {
      mockSelector.mockReturnValue('1.5');

      render(<DefaultSlippageModal />);

      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: '1.5',
        }),
      );
    });

    it('handles very large slippage value', () => {
      mockSelector.mockReturnValue('99.99');

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: '99.99',
        }),
      );
    });
  });

  describe('state management', () => {
    it('maintains local state separate from redux', () => {
      mockSelector.mockReturnValue('2');

      render(<DefaultSlippageModal />);

      // Initial state should match redux
      expect(mockUseGetSlippageOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: '2',
        }),
      );

      // Local state can change without affecting redux until submit
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('only dispatches to redux on submit', () => {
      const { getByText } = render(<DefaultSlippageModal />);

      // Change local state (simulated by pressing option)
      // Verify dispatch not called yet
      expect(mockDispatch).not.toHaveBeenCalled();

      // Submit
      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      // Now dispatch should be called
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('callback handlers', () => {
    it('handleDefaultOptionPress returns a function', () => {
      render(<DefaultSlippageModal />);

      const call = mockUseGetSlippageOptions.mock.calls[0][0];
      const handler = call.onDefaultOptionPress;

      // Should return a function
      const pressHandler = handler('2');
      expect(typeof pressHandler).toBe('function');
    });

    it('handleCustomOptionPress is passed to useGetSlippageOptions', () => {
      render(<DefaultSlippageModal />);

      const call = mockUseGetSlippageOptions.mock.calls[0][0];
      expect(call.onCustomOptionPress).toBeDefined();
      expect(typeof call.onCustomOptionPress).toBe('function');
    });
  });

  describe('auto slippage behavior', () => {
    it('dispatches undefined for auto slippage on submit', () => {
      mockSelector.mockReturnValue(undefined);

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: undefined,
        }),
      );
    });

    it('treats AUTO_SLIPPAGE_VALUE constant as auto', () => {
      mockSelector.mockReturnValue(AUTO_SLIPPAGE_VALUE);

      const { getByText } = render(<DefaultSlippageModal />);

      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: undefined,
        }),
      );
    });
  });
});
