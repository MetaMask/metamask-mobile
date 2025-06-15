import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SampleFeature from './SampleFeature';
import initialRootState from '../../../../util/test/initial-root-state';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
    addEventListener: jest.fn(() => ({
        remove: jest.fn(),
    })),
}));

describe('SampleFeature', () => {
    it('render matches snapshot', () => {
        const {toJSON} = renderWithProvider(<SampleFeature/>,
            { state: initialRootState });
        expect(toJSON()).toMatchSnapshot();
    });
});
