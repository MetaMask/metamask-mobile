import React from 'react';
import { render } from '@testing-library/react-native';
import KycPending from './KycPending';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), canGoBack: () => true }),
}));

describe('KycPending', () => {
  it('reports the pending result as viewed', () => {
    render(<KycPending />);

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('pending');
  });
});
