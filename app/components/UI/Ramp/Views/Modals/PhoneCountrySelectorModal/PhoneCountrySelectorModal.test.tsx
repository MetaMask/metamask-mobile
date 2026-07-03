import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PhoneCountrySelectorModal from './PhoneCountrySelectorModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import type { Country } from '@metamask/ramps-controller';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        {
          children,
          goBack,
        }: { children: React.ReactNode; goBack?: () => void },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            goBack?.();
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));
        return <>{children}</>;
      },
    ),
  };
});

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

const createMockCountry = (
  isoCode: string,
  name: string,
  flag: string,
  prefix: string,
  recommended = false,
): Country => ({
  isoCode,
  name,
  flag,
  recommended,
  phone: { prefix, placeholder: '', template: '' },
  currency: '',
  supported: { buy: true, sell: true },
});

const mockCountries = [
  createMockCountry('US', 'United States', '🇺🇸', '+1', true),
  createMockCountry('PT', 'Portugal', '🇵🇹', '+351'),
  createMockCountry('GB', 'United Kingdom', '🇬🇧', '+44'),
];

const mockOnCountrySelect = jest.fn();

let mockUseParamsValues = {
  countries: mockCountries,
  selectedCountry: mockCountries[1],
  onCountrySelect: mockOnCountrySelect,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    { name: 'PhoneCountrySelectorModal' },
    { state: { engine: { backgroundState } } },
  );
}

describe('PhoneCountrySelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsValues = {
      countries: mockCountries,
      selectedCountry: mockCountries[1],
      onCountrySelect: mockOnCountrySelect,
    };
  });

  it('renders searchable country list with phone prefixes', () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      PhoneCountrySelectorModal,
    );

    expect(getByPlaceholderText('Search by country')).toBeOnTheScreen();
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(getByText('+351')).toBeOnTheScreen();
  });

  it('filters countries by name and phone prefix', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderWithProvider(
      PhoneCountrySelectorModal,
    );

    fireEvent.changeText(getByPlaceholderText('Search by country'), '+44');

    expect(getByText('United Kingdom')).toBeOnTheScreen();
    expect(queryByText('Portugal')).not.toBeOnTheScreen();
  });

  it('calls onCountrySelect and closes when country is selected', () => {
    const { getByText } = renderWithProvider(PhoneCountrySelectorModal);

    fireEvent.press(getByText('United Kingdom'));

    expect(mockOnCountrySelect).toHaveBeenCalledWith(
      expect.objectContaining({ isoCode: 'GB' }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });
});
