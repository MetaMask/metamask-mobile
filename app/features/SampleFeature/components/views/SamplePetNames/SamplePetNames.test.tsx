import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import {waitFor} from '@testing-library/react-native';
import {SamplePetNames} from './SamplePetNames';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));


describe('SamplePetNamesForm', () => {
    it('render matches snapshot', async () => {
        const {toJSON} = renderWithProvider(
            <SamplePetNames/>,
            { state: initialRootState }
        );

        await waitFor(() => {
            expect(toJSON()).toMatchSnapshot();
        });
    });
});
