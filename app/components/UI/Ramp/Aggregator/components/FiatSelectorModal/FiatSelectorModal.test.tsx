import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import FiatSelectorModal from './FiatSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { RampSDK } from '../../sdk';
import { RampType } from '../../types';
import { mockNetworkState } from '../../../../../../util/test/network';

const mockCurrencies = [
  {
    id: 'usd',
    symbol: 'USD',
    name: 'US Dollar',
    denomSymbol: '$',
    decimals: 2,
  },
  {
    id: 'eur',
    symbol: 'EUR',
    name: 'Euro',
    denomSymbol: '€',
    decimals: 2,
  },
  {
    id: 'gbp',
    symbol: 'GBP',
    name: 'British Pound',
    denomSymbol: '£',
    decimals: 2,
  },
];

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.FIAT_SELECTOR,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            NetworkController: {
              ...mockNetworkState({
                chainId: '0x1',
                id: 'mainnet',
                nickname: 'Ethereum Mainnet',
                ticker: 'ETH',
              }),
            },
          },
        },
      },
    },
  );
}

const mockSetSelectedFiatCurrencyId = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  setSelectedFiatCurrencyId: mockSetSelectedFiatCurrencyId,
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

describe('FiatSelectorModal', () => {
  afterEach(() => {
    mockSetSelectedFiatCurrencyId.mockClear();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseParams.mockReturnValue({
      currencies: mockCurrencies,
      title: 'Select Currency',
    });
  });

  it('renders the modal with currency list', () => {
    const { getByText } = render(FiatSelectorModal);
    expect(getByText('USD')).toBeOnTheScreen();
    expect(getByText('EUR')).toBeOnTheScreen();
    expect(getByText('GBP')).toBeOnTheScreen();
  });

  describe('search', () => {
    it('displays filtered currencies when search string matches results', () => {
      const { getByTestId, toJSON } = render(FiatSelectorModal);
      const searchInput = getByTestId('textfieldsearch');
      fireEvent.changeText(searchInput, 'USD');
      expect(toJSON()).toMatchSnapshot();
    });
    it('displays filtered currencies when search string does not match results', () => {
      const { getByTestId, toJSON } = render(FiatSelectorModal);
      const searchInput = getByTestId('textfieldsearch');
      fireEvent.changeText(searchInput, 'Nonexistent Currency');
      expect(toJSON()).toMatchSnapshot();
    });
    it('displays max 20 results', () => {
      const { getByTestId, toJSON } = render(FiatSelectorModal);
      const searchInput = getByTestId('textfieldsearch');
      fireEvent.changeText(searchInput, 'u');
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
