import React from 'react';
import { render } from '@testing-library/react-native';
import SeedphraseModal from './';

describe('SeedphraseModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<SeedphraseModal showWhatIsSeedphraseModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
