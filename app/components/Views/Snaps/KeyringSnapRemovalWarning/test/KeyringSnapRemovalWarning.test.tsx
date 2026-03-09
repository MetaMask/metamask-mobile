import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import KeyringSnapRemovalWarning from '../KeyringSnapRemovalWarning';
import {
  KEYRING_SNAP_REMOVAL_WARNING,
  KEYRING_SNAP_REMOVAL_WARNING_CANCEL,
  KEYRING_SNAP_REMOVAL_WARNING_CONTINUE,
  KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT,
} from '../KeyringSnapRemovalWarning.constants';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Snap, SnapStatus } from '@metamask/snaps-utils';
import { SnapId } from '@metamask/snaps-sdk';
import { SemVerVersion } from '@metamask/utils';
import { createMockSnapInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { KEYRING_ACCOUNT_LIST_ITEM } from '../../components/KeyringAccountListItem/KeyringAccountListItem.constants';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('KeyringSnapRemovalWarning', () => {
  const mockSnapName = 'MetaMask Simple Snap Keyring';
  const mockSnap: Snap = {
    blocked: false,
    enabled: true,
    id: 'npm:@metamask/snap-simple-keyring-snap' as SnapId,
    initialPermissions: {
      'endowment:keyring': {
        allowedOrigins: ['https://metamask.github.io', 'metamask.github.io'],
      },
      'endowment:rpc': {
        dapps: true,
      },
      snap_manageAccounts: {},
      snap_manageState: {},
    },
    manifest: {
      version: '1.1.6' as SemVerVersion,
      description: 'An example of a key management snap for a simple keyring.',
      proposedName: mockSnapName,
      repository: {
        type: 'git',
        url: 'git+https://github.com/MetaMask/snap-simple-keyring.git',
      },
      source: {
        shasum: 'P2BbaJn6jb7+ecBF6mJJnheQ4j8dtEZ8O4FLqLv8e8M=',
        location: {
          npm: {
            filePath: 'dist/bundle.js',
            iconPath: 'images/icon.svg',
            packageName: '@metamask/snap-simple-keyring-snap',
            registry: 'https://registry.npmjs.org/',
          },
        },
      },
      initialPermissions: {
        'endowment:keyring': {
          allowedOrigins: ['https://metamask.github.io', 'metamask.github.io'],
        },
        'endowment:rpc': {
          dapps: true,
        },
        snap_manageAccounts: {},
        snap_manageState: {},
      },
      manifestVersion: '0.1',
    },
    status: 'stopped' as SnapStatus,
    version: '1.1.6' as SemVerVersion,
    versionHistory: [
      {
        version: '1.1.6',
        date: 1727403640652,
        origin: 'https://metamask.github.io',
      },
    ],
    auxiliaryFiles: [],
    localizationFiles: [],
  };

  const MOCK_ADDRESS_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  const MOCK_ADDRESS_2 = '0xA7E9922b0e7DB390c3B108127739eFebe4d6293E';

  const mockKeyringAccount1 = createMockSnapInternalAccount(
    MOCK_ADDRESS_1,
    'Snap Account 1',
  );
  const mockKeyringAccount2 = createMockSnapInternalAccount(
    MOCK_ADDRESS_2,
    'Snap Account 2',
  );

  const mockKeyringAccounts = [mockKeyringAccount1, mockKeyringAccount2];
  const onCancelMock = jest.fn();
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue({ chainId: '1' });
  });

  it('renders correctly with initial props', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={mockKeyringAccounts}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    expect(continueButton).toBeTruthy();
    expect(continueButton.props.children[1].props.children).toBe('Continue');

    const cancelButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CANCEL);
    expect(cancelButton).toBeTruthy();
    expect(cancelButton.props.children[1].props.children).toBe('Cancel');

    const warningBannerTitle = queryByText(
      'Be sure you can access any accounts created by this Snap on your own before removing it',
    );
    expect(warningBannerTitle).toBeTruthy();
  });

  it('renders the correct number of keyring account list items', () => {
    const { getAllByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={mockKeyringAccounts}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const accountListItems = getAllByTestId(KEYRING_ACCOUNT_LIST_ITEM);
    expect(accountListItems).toHaveLength(mockKeyringAccounts.length);
  });
  it('shows confirmation input when keyringAccounts is empty', () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={[]}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );
    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    expect(continueButton).toBeTruthy();
    expect(continueButton.props.disabled).toBe(true);
    expect(continueButton.props.children[1].props.children).toBe('Remove Snap');

    const textInput = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    expect(textInput).toBeTruthy();
  });

  it('enables continue button when correct snap name is entered', async () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={[]}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    expect(continueButton.props.disabled).toBe(true);

    const textInput = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    expect(textInput).toBeTruthy();
    fireEvent.changeText(textInput, mockSnapName);

    await waitFor(() => {
      expect(continueButton.props.disabled).toBe(false);
    });
  });

  it('does not enable continue button when incorrect snap name is entered', async () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={[]}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    expect(continueButton.props.disabled).toBe(true);

    const textInput = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    expect(textInput).toBeTruthy();
    fireEvent.changeText(textInput, 'Wrong snap name');

    await waitFor(() => {
      expect(continueButton.props.disabled).toBe(true);
    });
  });

  it('calls onSubmit when confirmed and continue is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={[]}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const textInput = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    expect(textInput).toBeTruthy();
    fireEvent.changeText(textInput, mockSnapName);

    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    fireEvent.press(continueButton);
    expect(onSubmitMock).toHaveBeenCalled();
  });

  it('displays error when onSubmit throws', async () => {
    onSubmitMock.mockImplementation(() => {
      throw new Error('Error');
    });

    const { getByTestId, getByText } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={[]}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const textInput = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    fireEvent.changeText(textInput, mockSnapName);

    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(getByText(`Failed to remove ${mockSnapName}`)).toBeTruthy();
    });
  });

  it('calls onCancel when cancel button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={mockKeyringAccounts}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const cancelButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CANCEL);
    fireEvent.press(cancelButton);

    expect(onCancelMock).toHaveBeenCalled();
  });

  it('calls onClose when BottomSheet is closed', () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={mockSnap}
        keyringAccounts={mockKeyringAccounts}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const bottomSheet = getByTestId(KEYRING_SNAP_REMOVAL_WARNING);
    fireEvent(bottomSheet, 'onClose');

    expect(onCloseMock).toHaveBeenCalled();
  });
  it('allows removal of snaps with empty names and keeps the continue button enabled', () => {
    const { getByTestId } = renderWithProvider(
      <KeyringSnapRemovalWarning
        snap={{
          ...mockSnap,
          manifest: { ...mockSnap.manifest, proposedName: '' },
        }}
        keyringAccounts={[]}
        onCancel={onCancelMock}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );
    const textInput = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    fireEvent.changeText(textInput, '');
    const continueButton = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_CONTINUE);
    expect(continueButton.props.disabled).toBe(false);
    expect(textInput.props.value).toBe('');
    expect(continueButton.props.children[1].props.children).toBe('Remove Snap');
  });
});
