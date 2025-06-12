import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SampleCounterPane } from './SampleCounterPane';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const mockIncrement = jest.fn();

jest.mock('../../hooks/useSampleCounter/useSampleCounter', () => ({
        __esModule: true,
        default: () => ({
                value: 42,
                increment: mockIncrement,
            }),
    }));

describe('SampleCounterPane', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('render matches snapshot', () => {
        const { toJSON } = renderWithProvider(<SampleCounterPane />);
        expect(toJSON()).toMatchSnapshot();
    });

    it('displays counter value', () => {
        const { getByTestId } = renderWithProvider(<SampleCounterPane />);
        const valueElement = getByTestId('sample-counter-pane-value');
        expect(valueElement).toBeDefined();
        expect(valueElement.props.children).toBe('Value: 42');
    });

    it('increments counter value', async () => {
        const { getByTestId } = renderWithProvider(<SampleCounterPane />);

        fireEvent.press(getByTestId('sample-counter-pane-increment-button'));

        await waitFor(() => {
            expect(mockIncrement).toHaveBeenCalledTimes(1);
        });
    });
});
