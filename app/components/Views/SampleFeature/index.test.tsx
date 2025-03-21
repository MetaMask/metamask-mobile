import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SampleFeature from './';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
    addEventListener: jest.fn(() => ({
        remove: jest.fn(),
    })),
}));

describe('SampleFeature', () => {
    it('render matches snapshot', () => {
        const {toJSON} = renderWithProvider(<SampleFeature/>);
        expect(toJSON()).toMatchSnapshot();
    });
});
