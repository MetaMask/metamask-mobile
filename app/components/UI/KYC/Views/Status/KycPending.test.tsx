import React from 'react';
import { render } from '@testing-library/react-native';
import KycPending from './KycPending';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');

describe('KycPending', () => {
  it('reports the pending result as viewed', () => {
    render(<KycPending onLeave={jest.fn()} />);

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('pending');
  });
});
