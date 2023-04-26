import React from 'react';
import { render } from '@testing-library/react-native';
import PhishingModal from './';

describe('PhishingModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<PhishingModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
