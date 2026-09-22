import { render } from '@testing-library/react-native';
import React from 'react';
import { useRoute } from '@react-navigation/native';
import { usePerpsScreenVsBottomSheetAbTest } from '../../hooks/usePerpsScreenVsBottomSheetAbTest';
import PerpsTPSLRouter from './PerpsTPSLRouter';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

jest.mock('../../hooks/usePerpsScreenVsBottomSheetAbTest', () => ({
  usePerpsScreenVsBottomSheetAbTest: jest.fn(),
}));

// Stubbed down to the variant prop, which is all the router decides.
jest.mock('../PerpsTPSLView/PerpsTPSLView', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ variant = 'screen' }: { variant?: string }) =>
      ReactActual.createElement(Text, { testID: `tpsl-${variant}` }, variant),
  };
});

const useRouteMock = useRoute as jest.MockedFunction<typeof useRoute>;
const useAbTestMock = usePerpsScreenVsBottomSheetAbTest as jest.MockedFunction<
  typeof usePerpsScreenVsBottomSheetAbTest
>;

const position = { symbol: 'ETH' };

describe('PerpsTPSLRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAbTestMock.mockReturnValue({ useBottomSheet: false });
  });

  it('renders the sheet for a position edit under treatment', () => {
    useRouteMock.mockReturnValue({ params: { position } } as never);
    useAbTestMock.mockReturnValue({ useBottomSheet: true });

    const { getByTestId } = render(<PerpsTPSLRouter />);

    expect(getByTestId('tpsl-sheet')).toBeOnTheScreen();
  });

  it('renders the screen for a position edit under control', () => {
    useRouteMock.mockReturnValue({ params: { position } } as never);

    const { getByTestId } = render(<PerpsTPSLRouter />);

    expect(getByTestId('tpsl-screen')).toBeOnTheScreen();
  });

  it('keeps the order flow on the screen even under treatment', () => {
    // No position param means TP/SL was opened while placing an order, which
    // already runs inside the trade sheet under treatment.
    useRouteMock.mockReturnValue({ params: { asset: 'ETH' } } as never);
    useAbTestMock.mockReturnValue({ useBottomSheet: true });

    const { getByTestId } = render(<PerpsTPSLRouter />);

    expect(getByTestId('tpsl-screen')).toBeOnTheScreen();
  });

  it('does not read the experiment for the order flow', () => {
    useRouteMock.mockReturnValue({ params: { asset: 'ETH' } } as never);

    render(<PerpsTPSLRouter />);

    // Reading it would record an exposure for users who are never treated.
    expect(useAbTestMock).not.toHaveBeenCalled();
  });
});
