import React from 'react';
import DeleteMetamaskAccountData from './DeleteMetamaskAccountData';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { Linking } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import {
  CONSENSYS_PRIVACY_POLICY,
  DELETE_ACCOUNT_DATA_FORM_URL,
} from '../../../../../constants/urls';

describe('DeleteMetamaskAccountData', () => {
  const initialState = {
    engine: {
      backgroundState: {
        SeedlessOnboardingController: {
          vault: 'test',
        },
      },
    },
  };

  it('renders match snapshot', () => {
    const { toJSON } = renderWithProvider(<DeleteMetamaskAccountData />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders nothing if not social login', () => {
    const { toJSON } = renderWithProvider(<DeleteMetamaskAccountData />, {
      state: {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: undefined,
            },
          },
        },
      },
    });
    expect(toJSON()).toBeNull();
  });

  it('renders the settings section if social login flow', async () => {
    const { getByText } = renderWithProvider(<DeleteMetamaskAccountData />, {
      state: initialState,
    });
    expect(
      getByText(strings('app_settings.delete_metamask_account_data_title')),
    ).toBeOnTheScreen();
  });

  it('opens the delete account data link when the button is pressed', async () => {
    const { getByText } = renderWithProvider(<DeleteMetamaskAccountData />, {
      state: initialState,
    });
    const button = getByText(
      strings('app_settings.delete_metamask_account_data_button'),
    );
    expect(button).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(button);
    });

    expect(Linking.openURL).toHaveBeenCalledWith(DELETE_ACCOUNT_DATA_FORM_URL);
  });

  it('opens the privacy policy link when the button is pressed', async () => {
    const { getByText } = renderWithProvider(<DeleteMetamaskAccountData />, {
      state: initialState,
    });

    const button = getByText(
      strings(
        'app_settings.delete_metamask_account_data_description_privacy_policy',
      ),
    );

    await act(async () => {
      fireEvent.press(button);
    });

    expect(Linking.openURL).toHaveBeenCalledWith(CONSENSYS_PRIVACY_POLICY);
  });
});
