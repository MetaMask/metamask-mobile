import React from 'react';
import { shallow } from 'enzyme';
import SeedphraseModal from './';

describe('SeedphraseModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<SeedphraseModal showWhatIsSeedphraseModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
