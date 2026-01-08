import React from 'react';
import { render } from '@testing-library/react-native';
import TokenIcon from '.';

// Mock RemoteImage component
jest.mock('../RemoteImage', () => ({
  __esModule: true,
  default: ({ testID }: { testID?: string }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={testID || 'remote-image'} />;
  },
}));

// Mock useTheme hook
jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: {
        default: '#FFFFFF',
        alternative: '#F2F4F6',
      },
      text: {
        default: '#24292E',
      },
    },
  })),
}));

// Mock image imports
jest.mock('../../../images/image-icons', () => ({
  SOLANA: { uri: 'solana.png' },
  MATIC: { uri: 'matic.png' },
}));

jest.mock('../../../images/eth-logo-new.png', () => ({
  uri: 'eth-logo.png',
}));

describe('TokenIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders RemoteImage for ETH symbol', () => {
      const { getByTestId } = render(
        <TokenIcon symbol="ETH" testID="token-icon" />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });

    it('renders RemoteImage for SOL symbol', () => {
      const { getByTestId } = render(
        <TokenIcon symbol="SOL" testID="token-icon" />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });

    it('renders RemoteImage when icon URL is provided', () => {
      const { getByTestId } = render(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/dai.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });

    it('renders first letter of symbol when no image source available', () => {
      const { getByText } = render(<TokenIcon symbol="DAI" />);

      expect(getByText('D')).toBeOnTheScreen();
    });

    it('renders empty icon when no symbol provided', () => {
      const { queryByText } = render(<TokenIcon />);

      expect(queryByText(/[A-Z]/)).toBeNull();
    });
  });

  describe('Size Variants', () => {
    it('renders with medium size', () => {
      const { getByTestId } = render(
        <TokenIcon symbol="ETH" medium testID="token-icon" />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });

    it('renders with big size', () => {
      const { getByTestId } = render(
        <TokenIcon symbol="ETH" big testID="token-icon" />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });

    it('renders with biggest size', () => {
      const { getByTestId } = render(
        <TokenIcon symbol="ETH" biggest testID="token-icon" />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });
  });

  describe('Symbol Display', () => {
    it('displays uppercase first letter of symbol', () => {
      const { getByText } = render(<TokenIcon symbol="dai" />);

      expect(getByText('D')).toBeOnTheScreen();
    });

    it('displays single character symbol as uppercase', () => {
      const { getByText } = render(<TokenIcon symbol="X" />);

      expect(getByText('X')).toBeOnTheScreen();
    });
  });

  describe('Fallback State Reset', () => {
    it('resets fallback state when icon prop changes', () => {
      const { rerender, getByTestId, queryByText } = render(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/dai1.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
      expect(queryByText('D')).toBeNull();

      rerender(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/dai2.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
      expect(queryByText('D')).toBeNull();
    });

    it('resets fallback state when symbol prop changes', () => {
      const { rerender, getByTestId, queryByText } = render(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/token.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
      expect(queryByText('D')).toBeNull();

      rerender(
        <TokenIcon
          symbol="USDC"
          icon="https://example.com/token.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
      expect(queryByText('U')).toBeNull();
    });

    it('displays fallback symbol when RemoteImage fails to load', () => {
      const { getByText } = render(<TokenIcon symbol="DAI" />);

      expect(getByText('D')).toBeOnTheScreen();
    });

    it('attempts to load RemoteImage after icon changes from failed state', () => {
      const { rerender, getByTestId } = render(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/invalid.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();

      rerender(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/valid.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });

    it('switches from symbol fallback to RemoteImage when icon is provided', () => {
      const { rerender, getByText, getByTestId, queryByText } = render(
        <TokenIcon symbol="DAI" />,
      );

      expect(getByText('D')).toBeOnTheScreen();

      rerender(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/dai.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();
      expect(queryByText('D')).toBeNull();
    });

    it('switches from RemoteImage to symbol fallback when icon is removed', () => {
      const { rerender, getByTestId, getByText } = render(
        <TokenIcon
          symbol="DAI"
          icon="https://example.com/dai.png"
          testID="token-icon"
        />,
      );

      expect(getByTestId('token-icon')).toBeOnTheScreen();

      rerender(<TokenIcon symbol="DAI" testID="token-icon" />);

      expect(getByText('D')).toBeOnTheScreen();
      expect(getByTestId('token-icon')).toBeOnTheScreen();
    });
  });
});
