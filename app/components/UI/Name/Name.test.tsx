import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { default as Name } from './Name';
import { render } from '@testing-library/react-native';
import { NameType } from './Name.types';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';

jest.mock('../../hooks/DisplayName/useDisplayName', () => ({
  __esModule: true,
  ...jest.requireActual('../../hooks/DisplayName/useDisplayName'),
  default: jest.fn(),
}));

jest.mock('../Identicon', () => ({
  __esModule: true,
  default: () => 'Identicon',
}));

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const EXPECTED_UNKNOWN_ADDRESS_CHECKSUMMED = '0x29900...A5B4e';

const UNKNOWN_ADDRESS_NOT_CHECKSUMMED =
  UNKNOWN_ADDRESS_CHECKSUMMED.toLowerCase();
const KNOWN_ADDRESS_CHECKSUMMED = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NAME_MOCK = 'Known name';

describe('Name', () => {
  const mockStore = configureMockStore();
  const initialState = {
    settings: { useBlockieIcon: true },
  };
  const store = mockStore(initialState);

  const mockUseDisplayName = (
    useDisplayName as jest.MockedFunction<typeof useDisplayName>
  ).mockReturnValue({
    variant: DisplayNameVariant.Unknown,
    name: '', // Added name property with empty string
  });

  describe('unknown address', () => {
    it('displays checksummed address', () => {
      const wrapper = render(
        <Provider store={store}>
          <Name
            type={NameType.EthereumAddress}
            value={UNKNOWN_ADDRESS_NOT_CHECKSUMMED}
          />
        </Provider>,
      );

      expect(
        wrapper.getByText(EXPECTED_UNKNOWN_ADDRESS_CHECKSUMMED),
      ).toBeTruthy();
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('recognized address', () => {
    it('should return name', () => {
      mockUseDisplayName.mockReturnValue({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NAME_MOCK,
      });

      const wrapper = render(
        <Provider store={store}>
          <Name
            type={NameType.EthereumAddress}
            value={KNOWN_ADDRESS_CHECKSUMMED}
          />
        </Provider>,
      );

      expect(wrapper.getByText(KNOWN_NAME_MOCK)).toBeTruthy();
      expect(wrapper).toMatchSnapshot();
    });
  });
});
