import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PriceImpactModal } from './index';
import { PriceImpactModalType } from './constants';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { TextColor } from '../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

// Mock BottomSheet
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

// Mock sub-components so we can assert on the props they receive
jest.mock('./PriceImpactHeader', () => ({
  PriceImpactHeader: jest.fn(
    ({ type, onClose }: { type: string; onClose: () => void }) => {
      const { View, TouchableOpacity, Text } =
        jest.requireActual('react-native');
      return (
        <View testID="price-impact-header">
          <Text testID="price-impact-header-type">{type}</Text>
          <TouchableOpacity
            testID="price-impact-header-close"
            onPress={onClose}
          >
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      );
    },
  ),
}));

jest.mock('./PriceImpactDescription', () => ({
  PriceImpactDescription: jest.fn(
    ({ type, priceImpact }: { type: string; priceImpact?: string }) => {
      const { View, Text } = jest.requireActual('react-native');
      return (
        <View testID="price-impact-description">
          <Text testID="price-impact-description-type">{type}</Text>
          {priceImpact ? (
            <Text testID="price-impact-description-value">{priceImpact}</Text>
          ) : null}
        </View>
      );
    },
  ),
}));

jest.mock('./PriceImpactFooter', () => ({
  PriceImpactFooter: jest.fn(
    ({
      type,
      onConfirm,
      onCancel,
      loading,
    }: {
      type: string;
      onConfirm: () => void;
      onCancel: () => Promise<void>;
      loading: boolean;
    }) => {
      const { View, TouchableOpacity, Text } =
        jest.requireActual('react-native');
      return (
        <View testID="price-impact-footer">
          <Text testID="price-impact-footer-type">{type}</Text>
          <Text testID="price-impact-footer-loading">{String(loading)}</Text>
          <TouchableOpacity
            testID="price-impact-footer-confirm"
            onPress={onConfirm}
          >
            <Text>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="price-impact-footer-cancel"
            onPress={onCancel}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    },
  ),
}));

// Mock hooks
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../hooks/useBridgeConfirm', () => ({
  useBridgeConfirm: jest.fn(),
}));

jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

jest.mock('../../hooks/useModalCloseOnQuoteExpiry', () => ({
  useModalCloseOnQuoteExpiry: jest.fn(),
}));

jest.mock('../../hooks/usePriceImpactViewData', () => ({
  usePriceImpactViewData: jest.fn(),
}));

import { useParams } from '../../../../../util/navigation/navUtils';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useModalCloseOnQuoteExpiry } from '../../hooks/useModalCloseOnQuoteExpiry';
import { usePriceImpactViewData } from '../../hooks/usePriceImpactViewData';
import { PriceImpactHeader } from './PriceImpactHeader';
import { PriceImpactDescription } from './PriceImpactDescription';
import { PriceImpactFooter } from './PriceImpactFooter';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;
const mockUseBridgeConfirm = useBridgeConfirm as jest.MockedFunction<
  typeof useBridgeConfirm
>;
const mockUseBridgeQuoteData = useBridgeQuoteData as jest.MockedFunction<
  typeof useBridgeQuoteData
>;
const mockUseModalCloseOnQuoteExpiry =
  useModalCloseOnQuoteExpiry as jest.MockedFunction<
    typeof useModalCloseOnQuoteExpiry
  >;
const mockUsePriceImpactViewData =
  usePriceImpactViewData as jest.MockedFunction<typeof usePriceImpactViewData>;
const mockPriceImpactHeader = PriceImpactHeader as jest.MockedFunction<
  typeof PriceImpactHeader
>;
const mockPriceImpactDescription =
  PriceImpactDescription as jest.MockedFunction<typeof PriceImpactDescription>;
const mockPriceImpactFooter = PriceImpactFooter as jest.MockedFunction<
  typeof PriceImpactFooter
>;

const mockConfirmBridge = jest.fn();

const mockToken = {
  address: '0xabc',
  decimals: 18,
  chainId: '0x1' as `0x${string}`,
  symbol: 'ETH',
  name: 'Ether',
  image: '',
};

const defaultParams = {
  type: PriceImpactModalType.Info,
  token: mockToken,
  location: MetaMetricsSwapsEventSource.MainView,
};

const defaultViewData = {
  textColor: TextColor.Alternative,
  icon: undefined,
};

describe('PriceImpactModal', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue(defaultParams);
    mockUseLatestBalance.mockReturnValue(undefined);
    mockUseBridgeConfirm.mockReturnValue(mockConfirmBridge);
    mockUseBridgeQuoteData.mockReturnValue({
      formattedQuoteData: undefined,
    } as ReturnType<typeof useBridgeQuoteData>);
    mockUsePriceImpactViewData.mockReturnValue(
      defaultViewData as ReturnType<typeof usePriceImpactViewData>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useModalCloseOnQuoteExpiry', () => {
    it('calls useModalCloseOnQuoteExpiry on render', () => {
      render(<PriceImpactModal />);

      expect(mockUseModalCloseOnQuoteExpiry).toHaveBeenCalled();
    });

    it('calls useModalCloseOnQuoteExpiry exactly once per render', () => {
      render(<PriceImpactModal />);

      expect(mockUseModalCloseOnQuoteExpiry).toHaveBeenCalledTimes(1);
    });
  });

  describe('component structure', () => {
    it('renders PriceImpactHeader', () => {
      const { getByTestId } = render(<PriceImpactModal />);

      expect(getByTestId('price-impact-header')).toBeTruthy();
    });

    it('renders PriceImpactDescription', () => {
      const { getByTestId } = render(<PriceImpactModal />);

      expect(getByTestId('price-impact-description')).toBeTruthy();
    });

    it('renders PriceImpactFooter', () => {
      const { getByTestId } = render(<PriceImpactModal />);

      expect(getByTestId('price-impact-footer')).toBeTruthy();
    });
  });

  describe('props passed to sub-components', () => {
    it('passes type to PriceImpactHeader', () => {
      mockUseParams.mockReturnValue({
        ...defaultParams,
        type: PriceImpactModalType.Execution,
      });

      render(<PriceImpactModal />);

      expect(mockPriceImpactHeader).toHaveBeenCalledWith(
        expect.objectContaining({ type: PriceImpactModalType.Execution }),
        expect.anything(),
      );
    });

    it('passes type to PriceImpactDescription', () => {
      render(<PriceImpactModal />);

      expect(mockPriceImpactDescription).toHaveBeenCalledWith(
        expect.objectContaining({ type: PriceImpactModalType.Info }),
        expect.anything(),
      );
    });

    it('passes type to PriceImpactFooter', () => {
      render(<PriceImpactModal />);

      expect(mockPriceImpactFooter).toHaveBeenCalledWith(
        expect.objectContaining({ type: PriceImpactModalType.Info }),
        expect.anything(),
      );
    });

    it('passes priceImpact to PriceImpactDescription when warningIcon is present', () => {
      mockUsePriceImpactViewData.mockReturnValue({
        textColor: TextColor.Error,
        icon: { name: IconName.Danger, color: TextColor.Error },
      } as ReturnType<typeof usePriceImpactViewData>);
      mockUseBridgeQuoteData.mockReturnValue({
        formattedQuoteData: { priceImpact: '5%' },
      } as ReturnType<typeof useBridgeQuoteData>);

      render(<PriceImpactModal />);

      expect(mockPriceImpactDescription).toHaveBeenCalledWith(
        expect.objectContaining({ formattedPriceImpact: '5%' }),
        expect.anything(),
      );
    });

    it('passes undefined priceImpact to PriceImpactDescription when warningIcon is absent', () => {
      mockUsePriceImpactViewData.mockReturnValue({
        textColor: TextColor.Alternative,
        icon: undefined,
      } as ReturnType<typeof usePriceImpactViewData>);
      mockUseBridgeQuoteData.mockReturnValue({
        formattedQuoteData: { priceImpact: '5%' },
      } as ReturnType<typeof useBridgeQuoteData>);

      render(<PriceImpactModal />);

      expect(mockPriceImpactDescription).toHaveBeenCalledWith(
        expect.objectContaining({ formattedPriceImpact: undefined }),
        expect.anything(),
      );
    });

    it('passes warningIconName and warningIconColor to PriceImpactHeader from view data', () => {
      mockUsePriceImpactViewData.mockReturnValue({
        textColor: TextColor.Warning,
        icon: { name: IconName.Warning, color: TextColor.Warning },
      } as ReturnType<typeof usePriceImpactViewData>);

      render(<PriceImpactModal />);

      expect(mockPriceImpactHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          warningIconName: IconName.Warning,
          warningIconColor: TextColor.Warning,
        }),
        expect.anything(),
      );
    });

    it('passes undefined warningIconName and warningIconColor when icon is absent', () => {
      render(<PriceImpactModal />);

      expect(mockPriceImpactHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          warningIconName: undefined,
          warningIconColor: undefined,
        }),
        expect.anything(),
      );
    });

    it('starts with loading false', () => {
      render(<PriceImpactModal />);

      expect(mockPriceImpactFooter).toHaveBeenCalledWith(
        expect.objectContaining({ loading: false }),
        expect.anything(),
      );
    });
  });

  describe('handleClose', () => {
    it('does not call confirmBridge when close is pressed', () => {
      const { getByTestId } = render(<PriceImpactModal />);

      fireEvent.press(getByTestId('price-impact-header-close'));

      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });
  });

  describe('handleProceed', () => {
    it('calls confirmBridge when the proceed (cancel) button is pressed', async () => {
      const { getByTestId } = render(<PriceImpactModal />);

      fireEvent.press(getByTestId('price-impact-footer-cancel'));

      await waitFor(() => {
        expect(mockConfirmBridge).toHaveBeenCalledTimes(1);
      });
    });

    it('sets loading to true while proceeding', async () => {
      const { getByTestId } = render(<PriceImpactModal />);

      fireEvent.press(getByTestId('price-impact-footer-cancel'));

      await waitFor(() => {
        expect(mockPriceImpactFooter).toHaveBeenCalledWith(
          expect.objectContaining({ loading: true }),
          expect.anything(),
        );
      });
    });
  });

  describe('hook wiring', () => {
    it('passes token address, decimals, and chainId to useLatestBalance', () => {
      render(<PriceImpactModal />);

      expect(mockUseLatestBalance).toHaveBeenCalledWith({
        address: mockToken.address,
        decimals: mockToken.decimals,
        chainId: mockToken.chainId,
      });
    });

    it('passes location to useBridgeConfirm', () => {
      render(<PriceImpactModal />);

      expect(mockUseBridgeConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          location: MetaMetricsSwapsEventSource.MainView,
        }),
      );
    });

    it('calls usePriceImpactViewData with the raw priceImpact from activeQuote', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: {
          quote: { priceData: { priceImpact: '0.12' } },
        },
        formattedQuoteData: { priceImpact: '12%' },
      } as ReturnType<typeof useBridgeQuoteData>);

      render(<PriceImpactModal />);

      expect(mockUsePriceImpactViewData).toHaveBeenCalledWith('0.12');
    });

    it('calls usePriceImpactViewData with undefined when activeQuote is absent', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: undefined,
        formattedQuoteData: undefined,
      } as ReturnType<typeof useBridgeQuoteData>);

      render(<PriceImpactModal />);

      expect(mockUsePriceImpactViewData).toHaveBeenCalledWith(undefined);
    });
  });
});
