import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { LEARN_MORE_URL } from '../../../../../../constants/urls';
import Routes from '../../../../../../constants/navigation/Routes';
import ProtectYourWallet from './ProtectYourWallet';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  internalAccount1,
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockNavigation = {
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn(),
  }),
});

jest.mock('../../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('ProtectYourWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when SRP is not backed up', () => {
    const { getByText, queryByText } = renderWithProvider(
      <ProtectYourWallet
        srpBackedup={false}
        hintText=""
        toggleHint={jest.fn()}
      />,
      {
        state: initialState,
      },
    );

    expect(getByText(strings('app_settings.protect_title'))).toBeDefined();
    expect(queryByText(strings('app_settings.protect_desc'))).toBeDefined();
    expect(getByText(strings('app_settings.learn_more'))).toBeDefined();
    expect(getByText(strings('app_settings.back_up_now'))).toBeDefined();
  });

  it('renders correctly when SRP is backed up', () => {
    const { getByText, queryByText } = renderWithProvider(
      <ProtectYourWallet srpBackedup hintText="" toggleHint={jest.fn()} />,
      {
        state: initialState,
      },
    );

    expect(getByText(strings('app_settings.protect_title'))).toBeDefined();
    expect(queryByText(strings('app_settings.protect_desc'))).toBeDefined();
    expect(
      getByText(strings('app_settings.seedphrase_backed_up')),
    ).toBeDefined();
    expect(
      getByText(strings('reveal_credential.seed_phrase_title')),
    ).toBeDefined();
    expect(queryByText(strings('app_settings.learn_more'))).toBeNull();
  });

  it('shows hint button when hint text is available', () => {
    const { getByText } = renderWithProvider(
      <ProtectYourWallet
        srpBackedup
        hintText="Test hint"
        toggleHint={jest.fn()}
      />,
      {
        state: initialState,
      },
    );

    expect(getByText(strings('app_settings.view_hint'))).toBeDefined();
  });

  it('handles Learn More button press', () => {
    const mockOpenURL = jest.fn();
    jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);

    const { getByText } = renderWithProvider(
      <ProtectYourWallet
        srpBackedup={false}
        hintText=""
        toggleHint={jest.fn()}
      />,
      {
        state: initialState,
      },
    );

    fireEvent.press(getByText(strings('app_settings.learn_more')));
    expect(mockOpenURL).toHaveBeenCalledWith(LEARN_MORE_URL);
  });

  it('handles Back Up Now button press', () => {
    const { getByText } = renderWithProvider(
      <ProtectYourWallet
        srpBackedup={false}
        hintText=""
        toggleHint={jest.fn()}
      />,
      {
        state: initialState,
      },
    );

    fireEvent.press(getByText(strings('app_settings.back_up_now')));
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.ACCOUNT_BACKUP.STEP_1_B,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('handles hint toggle', () => {
    const mockToggleHint = jest.fn();
    const { getByText } = renderWithProvider(
      <ProtectYourWallet
        srpBackedup
        hintText="Test hint"
        toggleHint={mockToggleHint}
      />,
      {
        state: initialState,
      },
    );

    fireEvent.press(getByText(strings('app_settings.view_hint')));
    expect(mockToggleHint).toHaveBeenCalled();
  });

  it('shows error banner when SRP is not backed up', () => {
    const { getByText } = renderWithProvider(
      <ProtectYourWallet
        srpBackedup={false}
        hintText=""
        toggleHint={jest.fn()}
      />,
      {
        state: initialState,
      },
    );

    expect(
      getByText(strings('app_settings.seedphrase_not_backed_up')),
    ).toBeDefined();
  });

  it('shows success banner when SRP is backed up', () => {
    const { getByText } = renderWithProvider(
      <ProtectYourWallet srpBackedup hintText="" toggleHint={jest.fn()} />,
      {
        state: initialState,
      },
    );

    expect(
      getByText(strings('app_settings.seedphrase_backed_up')),
    ).toBeDefined();
  });

  describe('Reveal Seed Phrase button press', () => {
    it('handles Reveal Seed Phrase button press', () => {
      const { getByText } = renderWithProvider(
        <ProtectYourWallet srpBackedup hintText="" toggleHint={jest.fn()} />,
        { state: initialState },
      );

      fireEvent.press(
        getByText(strings('reveal_credential.seed_phrase_title')),
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
        {
          shouldUpdateNav: true,
        },
      );
    });
    it('opens opens SrpList if there are multiple HD keyrings', async () => {
      const mockKeyring1 = {
        type: KeyringTypes.hd,
        accounts: [internalAccount1.address],
        metadata: {
          id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
          name: '',
        },
      };

      const mockKeyring2 = {
        type: KeyringTypes.hd,
        accounts: [internalAccount2.address],
        metadata: {
          id: '01JKZ56KRVYEEHC601HSNW28T2',
          name: '',
        },
      };

      const stateWithMultipleHdKeyrings = {
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            KeyringController: {
              keyrings: [mockKeyring1, mockKeyring2],
            },
          },
        },
      };

      const { getByText } = renderWithProvider(
        <ProtectYourWallet srpBackedup hintText="" toggleHint={jest.fn()} />,
        {
          state: stateWithMultipleHdKeyrings,
        },
      );

      fireEvent.press(
        getByText(strings('reveal_credential.seed_phrase_title')),
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.SELECT_SRP,
        },
      );
    });
  });
});
