import React from 'react';
import QRAccountDisplay from './index';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import backgroundState from '../../../util/test/initial-background-state.json';
import ClipboardManager from '../../../core/ClipboardManager';
import { MOCK_SOLANA_ACCOUNT } from '../../../util/test/accountsControllerTestUtils';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  TextProps,
} from '@metamask/design-system-react-native';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const ACCOUNT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

jest.mock('../../../core/ClipboardManager', () => {
  let clipboardContent = '';

  return {
    setString: jest.fn((str) => {
      clipboardContent = str;
    }),
    getString: jest.fn(() => clipboardContent),
  };
});

const TestWrapper = ({
  accountAddress,
  label,
  labelProps,
  description,
  descriptionProps,
}: {
  accountAddress: string;
  label?: string | React.ReactNode;
  labelProps?: Partial<TextProps>;
  description?: string | React.ReactNode;
  descriptionProps?: Partial<TextProps>;
}) => (
  <QRAccountDisplay
    accountAddress={accountAddress}
    label={label}
    labelProps={labelProps}
    description={description}
    descriptionProps={descriptionProps}
  />
);

describe('QRAccountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('copies address to clipboard when copy button is pressed', async () => {
    // Arrange
    const { getByTestId } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Act
    const copyButton = getByTestId('qr-account-display-copy-button');
    fireEvent.press(copyButton);

    // Assert
    expect(copyButton).toBeOnTheScreen();
    expect(ClipboardManager.setString).toHaveBeenCalledWith(ACCOUNT);
    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
    expect(ClipboardManager.getString()).toBe(ACCOUNT);
  });

  it('renders Solana account address without 0x prefix', () => {
    // Arrange
    const stateWithSolanaAccount = {
      engine: {
        backgroundState: {
          ...backgroundState,
          AccountsController: {
            internalAccounts: {
              accounts: {
                [MOCK_SOLANA_ACCOUNT.id]: MOCK_SOLANA_ACCOUNT,
              },
            },
          },
        },
      },
    };

    // Act
    const { getByText, queryByText } = renderScreen(
      () => <TestWrapper accountAddress={MOCK_SOLANA_ACCOUNT.address} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: stateWithSolanaAccount },
    );

    // Assert
    expect(getByText('Solana Account')).toBeOnTheScreen();
    expect(queryByText(/^0x/)).toBeNull();
    expect(getByText(/7EcDhS/)).toBeOnTheScreen();
    expect(getByText(/CFLtV$/)).toBeOnTheScreen();
  });

  it('renders custom label when provided as string', () => {
    // Arrange
    const customLabel = 'Custom Account Label';

    // Act
    const { getByText } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} label={customLabel} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert
    expect(getByText(customLabel)).toBeOnTheScreen();
  });

  it('renders custom label when provided as ReactNode', () => {
    // Arrange
    const customLabel = (
      <Text testID="custom-label-node">Custom React Node Label</Text>
    );

    // Act
    const { getByTestId } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} label={customLabel} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert
    expect(getByTestId('custom-label-node')).toBeOnTheScreen();
  });

  it('applies labelProps to label text component', () => {
    // Arrange
    const customLabel = 'Custom Label';
    const labelProps = {
      variant: TextVariant.HeadingLg,
      color: TextColor.TextDefault,
      fontWeight: FontWeight.Bold,
    };

    // Act
    const { getByText } = renderScreen(
      () => (
        <TestWrapper
          accountAddress={ACCOUNT}
          label={customLabel}
          labelProps={labelProps}
        />
      ),
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert
    expect(getByText(customLabel)).toBeOnTheScreen();
  });

  it('renders description when provided as string', () => {
    // Arrange
    const customDescription = 'This is a custom description';

    // Act
    const { getByText } = renderScreen(
      () => (
        <TestWrapper accountAddress={ACCOUNT} description={customDescription} />
      ),
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert
    expect(getByText(customDescription)).toBeOnTheScreen();
  });

  it('renders description when provided as ReactNode', () => {
    // Arrange
    const customDescription = (
      <Text testID="custom-description-node">
        Custom React Node Description
      </Text>
    );

    // Act
    const { getByTestId } = renderScreen(
      () => (
        <TestWrapper accountAddress={ACCOUNT} description={customDescription} />
      ),
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert
    expect(getByTestId('custom-description-node')).toBeOnTheScreen();
  });

  it('does not render description when not provided', () => {
    // Arrange & Act
    const { queryByText } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert - no specific description text should be present
    expect(queryByText(/description/i)).toBeNull();
  });

  it('displays truncated address with correct format', () => {
    // Arrange
    const expectedStart = ACCOUNT.substring(0, 6); // 0xd8dA
    const expectedEnd = ACCOUNT.substring(ACCOUNT.length - 5); // A6045

    // Act
    const { getAllByText } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    // Assert
    const startElements = getAllByText(new RegExp(expectedStart));
    const endElements = getAllByText(new RegExp(expectedEnd));
    expect(startElements.length).toBeGreaterThan(0);
    expect(endElements.length).toBeGreaterThan(0);
  });
});
