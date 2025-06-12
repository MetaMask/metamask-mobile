import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import networkImage from '../../../../images/ethereum.png';
import {SampleNetworkDisplay} from './SampleNetworkDisplay';

describe('SampleNetworkDisplay', () => {
    it('render matches snapshot', () => {
        const {toJSON} = renderWithProvider(
            <SampleNetworkDisplay
                name={'My test network'}
                imageSource={networkImage}/>
        );
        expect(toJSON()).toMatchSnapshot();
    });
});

