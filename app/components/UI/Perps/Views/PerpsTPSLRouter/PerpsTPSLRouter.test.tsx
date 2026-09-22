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

  it('renders the sheet when the caller resolved the treatment', () => {
    useRouteMock.mockReturnValue({
      params: { position, useBottomSheet: true },
    } as never);

    const { getByTestId } = render(<PerpsTPSLRouter />);

    expect(getByTestId('tpsl-sheet')).toBeOnTheScreen();
  });

  it('renders the screen for a position edit under control', () => {
    useRouteMock.mockReturnValue({ params: { position } } as never);

    const { getByTestId } = render(<PerpsTPSLRouter />);

    expect(getByTestId('tpsl-screen')).toBeOnTheScreen();
  });

  it('keeps the order flow on the screen', () => {
    // The order flow omits the param: it already runs inside the trade sheet
    // under treatment, so converting it would stack a sheet on a sheet.
    useRouteMock.mockReturnValue({ params: { asset: 'ETH' } } as never);

    const { getByTestId } = render(<PerpsTPSLRouter />);

    expect(getByTestId('tpsl-screen')).toBeOnTheScreen();
  });

  it('never reads the experiment itself', () => {
    // The navigator needs the arm before this mounts, so the caller owns the
    // read. Reading it here too would expose the order flow, which is never
    // treated.
    useRouteMock.mockReturnValue({
      params: { position, useBottomSheet: true },
    } as never);

    render(<PerpsTPSLRouter />);

    expect(useAbTestMock).not.toHaveBeenCalled();
  });
});
