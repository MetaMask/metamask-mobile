import React from 'react';
import {waitFor} from '@testing-library/react-native';
import {SamplePetNamesList} from './SamplePetNamesList';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
    addEventListener: jest.fn(() => ({
        remove: jest.fn(),
    })),
}));

const mockSelectAddressBookByChain = jest.fn().mockReturnValue([]);

jest.mock('../../../../../selectors/addressBookController', () => ({
    ...jest.requireActual('../../../../../selectors/addressBookController'),
    selectAddressBookByChain: () => mockSelectAddressBookByChain(),
}));

describe('SamplePetNamesList', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('render matches snapshot', () => {
        const {toJSON} = renderWithProvider(<SamplePetNamesList chainId={'0x1'} onAccountPress={jest.fn}/>,
            {state: initialRootState});
        expect(toJSON()).toMatchSnapshot();
    });

    it('displays addresses', async () => {

        const mockAddressBook = {
            '0xE191c1cc6EB6D2b79cC1e55463A39045Ff8F2781': {
                address: '0xE191c1cc6EB6D2b79cC1e55463A39045Ff8F2781',
                name: 'Alice',
                chainId: '0x1',
                memo: '',
                isEns: false,
            },
            '0x2a8EB6bbD9831814fD62879Bcc82c606e8477886': {
                address: '0x2a8EB6bbD9831814fD62879Bcc82c606e8477886',
                name: 'Bob',
                chainId: '0x1',
                memo: '',
                isEns: false,
            }
        };

        mockSelectAddressBookByChain.mockReturnValue(mockAddressBook);

        const {getByText} = renderWithProvider(
            <SamplePetNamesList chainId={'0x1'} onAccountPress={jest.fn()}/>,
            {state: initialRootState}
        );

        await waitFor(() => {
            expect(getByText('Alice')).toBeTruthy();
            expect(getByText('Bob')).toBeTruthy();
            expect(getByText('0xE191c...F2781')).toBeTruthy();
            expect(getByText('0x2a8EB...77886')).toBeTruthy();
        });
    });
});
