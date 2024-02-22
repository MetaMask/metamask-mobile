import React from 'react';
import { render } from '@testing-library/react-native';
import TimeEstimateInfoModal from './';

describe('TimeEstimateInfoModal', () => {
  it('should render correctly', () => {
    const wrapper = render(<TimeEstimateInfoModal timeEstimateId={'medium'} />);
    expect(wrapper).toMatchSnapshot();
  });
});
