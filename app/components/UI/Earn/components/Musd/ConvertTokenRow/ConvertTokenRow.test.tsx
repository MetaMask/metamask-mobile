import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../../Views/confirmations/types/token';
import useFiatFormatter from '../../../../SimulationDetails/FiatDisplay/useFiatFormatter';

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));
jest.mock('../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));
jest.mock('../../../../SimulationDetails/FiatDisplay/useFiatFormatter', () =>
  jest.fn(
    () => (value: { toNumber: () => number }) =>
      value.toNumber() > 0 ? `$${value.toNumber().toFixed(2)}` : '',
  ),
);
jest.mock('../../EarnNetworkAvatar', () => ({
  EarnNetworkAvatar: () => null,
}));

import { useStyles } from '../../../../../hooks/useStyles';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import ConvertTokenRow, { ConvertTokenRowTestIds } from './index';
import { ConvertTokenRowProps } from './ConvertTokenRow.types';

const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

const createMockToken = (overrides: Partial<AssetType> = {}): AssetType =>
  ({
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
    chainId: '0x1' as Hex,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '100',
    fiat: { balance: 100, currency: 'usd', conversionRate: 1 },
    logo: 'https://example.com/usdc.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdc.png',
    ...overrides,
  }) as AssetType;

const createMockStyles = () => ({
  container: {},
  row: {},
  left: {},
  right: {},
  tokenInfo: {},
  tokenIconContainer: {},
  editButton: {},
  errorText: {},
});

describe('ConvertTokenRow', () => {
  const mockOnMaxPress = jest.fn();
  const mockOnEditPress = jest.fn();

  const defaultProps: ConvertTokenRowProps = {
    token: createMockToken(),
    onMaxPress: mockOnMaxPress,
    onEditPress: mockOnEditPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStyles.mockReturnValue({
      styles: createMockStyles(),
      theme: {},
    } as ReturnType<typeof useStyles>);
    jest
      .mocked(useFiatFormatter)
      .mockImplementation(
        () => (value: { toNumber: () => number }) =>
          value.toNumber() > 0 ? `$${value.toNumber().toFixed(2)}` : '',
      );
  });

  describe('rendering', () => {
    it('renders container with convert-token-row-container testID', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} />,
        { state: initialRootState },
      );

      expect(getByTestId(ConvertTokenRowTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders token icon with convert-token-row-token-icon testID', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} />,
        { state: initialRootState },
      );

      expect(getByTestId(ConvertTokenRowTestIds.TOKEN_ICON)).toBeOnTheScreen();
    });

    it('renders token balance with convert-token-row-token-balance testID', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} />,
        { state: initialRootState },
      );

      expect(
        getByTestId(ConvertTokenRowTestIds.TOKEN_BALANCE),
      ).toBeOnTheScreen();
    });

    it('renders token name with convert-token-row-token-name testID', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} />,
        { state: initialRootState },
      );

      expect(getByTestId(ConvertTokenRowTestIds.TOKEN_NAME)).toBeOnTheScreen();
    });

    it('renders Max button with convert-token-row-max-button testID when not pending', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isConversionPending={false} />,
        { state: initialRootState },
      );

      expect(getByTestId(ConvertTokenRowTestIds.MAX_BUTTON)).toBeOnTheScreen();
    });

    it('renders Edit button with convert-token-row-edit-button testID when not pending', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isConversionPending={false} />,
        { state: initialRootState },
      );

      expect(getByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)).toBeOnTheScreen();
    });

    it('renders error message when errorMessage prop is provided', () => {
      const errorMessage = 'Conversion failed';
      const { getByText } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} errorMessage={errorMessage} />,
        { state: initialRootState },
      );

      expect(getByText(errorMessage)).toBeOnTheScreen();
    });

    it('does not render error message when errorMessage is undefined', () => {
      const { queryByText } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} />,
        { state: initialRootState },
      );

      expect(queryByText('Conversion failed')).toBeNull();
    });

    it('does not render error message when errorMessage is empty string', () => {
      const { queryByText } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} errorMessage="" />,
        { state: initialRootState },
      );

      expect(queryByText('Conversion failed')).toBeNull();
    });

    it('displays token symbol in token name', () => {
      const token = createMockToken({ symbol: 'USDT' });
      const { getByText } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} token={token} />,
        { state: initialRootState },
      );

      expect(getByText('USDT')).toBeOnTheScreen();
    });
  });

  describe('pending state', () => {
    it('hides Max and Edit buttons when isConversionPending is true', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isConversionPending />,
        { state: initialRootState },
      );

      expect(getByTestId(ConvertTokenRowTestIds.CONTAINER)).toBeOnTheScreen();
      expect(queryByTestId(ConvertTokenRowTestIds.MAX_BUTTON)).toBeNull();
      expect(queryByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)).toBeNull();
    });
  });

  describe('disabled button behavior', () => {
    it('Max button has isDisabled true when isActionsDisabled is true', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isActionsDisabled />,
        { state: initialRootState },
      );

      const maxButton = getByTestId(ConvertTokenRowTestIds.MAX_BUTTON);

      expect(maxButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('Edit button has isDisabled true when isActionsDisabled is true', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isActionsDisabled />,
        { state: initialRootState },
      );

      const editButton = getByTestId(ConvertTokenRowTestIds.EDIT_BUTTON);

      expect(editButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('Max button has isDisabled false when isActionsDisabled is false', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isActionsDisabled={false} />,
        { state: initialRootState },
      );

      const maxButton = getByTestId(ConvertTokenRowTestIds.MAX_BUTTON);

      expect(maxButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('Edit button has isDisabled false when isActionsDisabled is false', () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} isActionsDisabled={false} />,
        { state: initialRootState },
      );

      const editButton = getByTestId(ConvertTokenRowTestIds.EDIT_BUTTON);

      expect(editButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('calls onMaxPress with token when Max button is pressed and not disabled', async () => {
      const token = createMockToken({ symbol: 'DAI' });
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow
          {...defaultProps}
          token={token}
          isActionsDisabled={false}
          isConversionPending={false}
        />,
        { state: initialRootState },
      );

      const maxButton = getByTestId(ConvertTokenRowTestIds.MAX_BUTTON);

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(mockOnMaxPress).toHaveBeenCalledTimes(1);
      expect(mockOnMaxPress).toHaveBeenCalledWith(token);
    });

    it('calls onEditPress with token when Edit button is pressed and not disabled', async () => {
      const token = createMockToken({ symbol: 'USDT' });
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow
          {...defaultProps}
          token={token}
          isActionsDisabled={false}
          isConversionPending={false}
        />,
        { state: initialRootState },
      );

      const editButton = getByTestId(ConvertTokenRowTestIds.EDIT_BUTTON);

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(mockOnEditPress).toHaveBeenCalledTimes(1);
      expect(mockOnEditPress).toHaveBeenCalledWith(token);
    });

    it('does not call onMaxPress when Max button is pressed and isActionsDisabled is true', async () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow
          {...defaultProps}
          isActionsDisabled
          isConversionPending={false}
        />,
        { state: initialRootState },
      );

      const maxButton = getByTestId(ConvertTokenRowTestIds.MAX_BUTTON);

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(mockOnMaxPress).not.toHaveBeenCalled();
    });

    it('does not call onEditPress when Edit button is pressed and isActionsDisabled is true', async () => {
      const { getByTestId } = renderWithProvider(
        <ConvertTokenRow
          {...defaultProps}
          isActionsDisabled
          isConversionPending={false}
        />,
        { state: initialRootState },
      );

      const editButton = getByTestId(ConvertTokenRowTestIds.EDIT_BUTTON);

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(mockOnEditPress).not.toHaveBeenCalled();
    });
  });

  describe('balance display', () => {
    it('displays fiat balance when token has fiat balance', () => {
      const token = createMockToken({
        fiat: { balance: 123.45, currency: 'usd', conversionRate: 1 },
      });
      const mockFormatFiat = jest.fn(() => '$123.45');
      jest.mocked(useFiatFormatter).mockReturnValue(mockFormatFiat);

      const { getByText, getByTestId } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} token={token} />,
        { state: initialRootState },
      );

      expect(mockFormatFiat).toHaveBeenCalled();
      expect(getByText('$123.45')).toBeOnTheScreen();
      expect(
        getByTestId(ConvertTokenRowTestIds.TOKEN_BALANCE),
      ).toBeOnTheScreen();
    });

    it('falls back to balance and symbol when fiat balance is zero', () => {
      const token = createMockToken({
        balance: '50',
        symbol: 'USDC',
        fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
      });
      const mockFormatFiat = jest.fn(() => '$0.00');
      jest.mocked(useFiatFormatter).mockReturnValue(mockFormatFiat);

      const { getByText } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} token={token} />,
        { state: initialRootState },
      );

      expect(mockFormatFiat).not.toHaveBeenCalled();
      expect(getByText('50 USDC')).toBeOnTheScreen();
    });

    it('displays balance and symbol when token has undefined fiat', () => {
      const token = createMockToken({
        balance: '25',
        symbol: 'DAI',
        fiat: undefined,
      });
      const mockFormatFiat = jest.fn(() => '$999.00');
      jest.mocked(useFiatFormatter).mockReturnValue(mockFormatFiat);

      const { getByText } = renderWithProvider(
        <ConvertTokenRow {...defaultProps} token={token} />,
        { state: initialRootState },
      );

      expect(mockFormatFiat).not.toHaveBeenCalled();
      expect(getByText('25 DAI')).toBeOnTheScreen();
    });
  });
});
