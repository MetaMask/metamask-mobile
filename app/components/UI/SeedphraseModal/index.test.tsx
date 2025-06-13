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

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }, ref) => {
      const onCloseBottomSheet = jest.fn();
      if (ref && typeof ref === 'function') {
        ref({ onCloseBottomSheet });
      }
      return <div data-testid="mock-bottom-sheet">{children}</div>;
    }),
  }),
);

describe('SeedphraseModal', () => {
  const setupTest = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });

    const wrapper = renderWithProvider(<SeedphraseModal />);

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
    };
  };

  it('should render correctly', () => {
    const { wrapper } = setupTest();
    expect(wrapper).toMatchSnapshot();
  });

  it('should render title and explanation text', () => {
    const { wrapper } = setupTest();
    const title = wrapper.getByText(
      strings('account_backup_step_1.what_is_seedphrase_title'),
    );
    expect(title).toBeTruthy();
    const explanationText = wrapper.getByText(
      strings('account_backup_step_1.what_is_seedphrase_text_1'),
    );
    expect(explanationText).toBeTruthy();
    const listItem = wrapper.getByText(
      strings('account_backup_step_1.what_is_seedphrase_text_4'),
    );
    expect(listItem).toBeTruthy();
    const bullet = wrapper.getAllByText('•');
    expect(bullet.length).toBe(3);
  });

  it('should render cta actions', () => {
    const { wrapper, mockGoBack } = setupTest();

    const confirmButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.what_is_seedphrase_confirm'),
    });

    expect(confirmButton).toBeTruthy();
    expect(confirmButton).toBeEnabled();
    fireEvent.press(confirmButton);
    expect(mockGoBack).toHaveBeenCalled();
  });
});
