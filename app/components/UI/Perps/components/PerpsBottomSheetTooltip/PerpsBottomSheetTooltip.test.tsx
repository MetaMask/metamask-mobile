import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsBottomSheetTooltip from './PerpsBottomSheetTooltip';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { PerpsBottomSheetTooltipProps } from './PerpsBottomSheetTooltip.types';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsOrderProvider } from '../../contexts/PerpsOrderContext';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('PerpsBottomSheetTooltip', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialMetrics: Metrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };

  const renderBottomSheetTooltip = ({
    isVisible = true,
    onClose = mockOnClose,
    contentKey = 'leverage',
    testID = PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP,
  }: PerpsBottomSheetTooltipProps) =>
    renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PerpsBottomSheetTooltip
          isVisible={isVisible}
          onClose={onClose}
          contentKey={contentKey}
          testID={testID}
        />
      </SafeAreaProvider>,
    );

  it('renders correctly when visible', () => {
    const { getByTestId, getByText, toJSON } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'leverage',
    });

    expect(toJSON()).toMatchSnapshot();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP),
    ).toBeTruthy();
    // The BottomSheetHeader component uses its own default testID
    expect(getByTestId('header')).toBeTruthy();
    expect(getByTestId(PerpsBottomSheetTooltipSelectorsIDs.TITLE)).toBeTruthy();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
    ).toBeTruthy();
    expect(getByText('Leverage')).toBeTruthy();
    expect(
      getByText(
        'Leverage lets you trade with more than you put in. It can boost your profits, but also your losses. The higher the leverage, the riskier the trade.',
      ),
    ).toBeTruthy();
    expect(getByText('Got it')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = renderBottomSheetTooltip({
      isVisible: false,
      onClose: mockOnClose,
      contentKey: 'leverage',
    });

    expect(
      queryByTestId(PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP),
    ).toBeNull();
  });

  it('calls onClose when button is pressed', async () => {
    const { getByTestId } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'leverage',
    });

    fireEvent.press(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
    );

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders different content for different contentKey (Margin Tooltip)', () => {
    const { getByText } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'margin',
    });

    expect(getByText('Margin')).toBeTruthy();
    expect(
      getByText(
        "Margin is the money you put in to open a trade. It acts as collateral, and it's the most you can lose on that trade.",
      ),
    ).toBeTruthy();
  });

  it('renders custom tooltip content correctly (Fee Tooltip)', () => {
    const params = {
      initialAsset: 'BTC',
      initialDirection: 'long' as const,
      initialAmount: '6',
      initialLeverage: 5,
    };

    const { getByText, queryAllByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PerpsOrderProvider {...params}>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={mockOnClose}
            contentKey={'fees'}
            testID={PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP}
          />
        </PerpsOrderProvider>
      </SafeAreaProvider>,
    );

    expect(getByText('Fees')).toBeTruthy();
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
    expect(queryAllByText('0.000%').length).toBe(2);
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-tooltip-test-id';
    const { getByTestId } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'leverage',
      testID: customTestID,
    });

    expect(getByTestId(customTestID)).toBeTruthy();
    expect(getByTestId('header')).toBeTruthy();
    expect(getByTestId(PerpsBottomSheetTooltipSelectorsIDs.TITLE)).toBeTruthy();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
    ).toBeTruthy();
  });
});
