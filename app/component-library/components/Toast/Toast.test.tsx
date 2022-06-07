/* eslint-disable no-console */
/* @jest-environment jsdom */
import React from 'react';
import { shallow } from 'enzyme';
import Toast from './';

describe('Toast', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Toast />);
    expect(wrapper).toMatchSnapshot();
  });
});
