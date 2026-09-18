import React from 'react';
import SeedphraseModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

describe('SeedphraseModal', () => {
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: mockGoBack,
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });
  });

  it('renders title, description, and safety rows', () => {
    const { getByText } = renderWithProvider(<SeedphraseModal />);

    expect(
      getByText(strings('account_backup_step_1.what_is_seedphrase_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('account_backup_step_1.what_is_seedphrase_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('account_backup_step_1.keep_private_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('account_backup_step_1.keep_private_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('account_backup_step_1.store_safely_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('account_backup_step_1.store_safely_description')),
    ).toBeOnTheScreen();
  });

  it('renders Got it button', () => {
    const { getByRole } = renderWithProvider(<SeedphraseModal />);

    expect(
      getByRole('button', {
        name: strings('account_backup_step_1.what_is_seedphrase_confirm'),
      }),
    ).toBeOnTheScreen();
  });

  it('closes the sheet when Got it is pressed', () => {
    const { getByRole } = renderWithProvider(<SeedphraseModal />);

    fireEvent.press(
      getByRole('button', {
        name: strings('account_backup_step_1.what_is_seedphrase_confirm'),
      }),
    );

    expect(mockGoBack).toHaveBeenCalled();
  });
});
