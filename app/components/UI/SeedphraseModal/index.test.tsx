import React from 'react';
import { render } from '@testing-library/react-native';
import SeedphraseModal from './';

describe('SeedphraseModal', () => {
  it('should render correctly', () => {
    const wrapper = render(<SeedphraseModal showWhatIsSeedphraseModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
