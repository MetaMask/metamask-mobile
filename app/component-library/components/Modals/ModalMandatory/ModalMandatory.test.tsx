import React from 'react';
import { shallow } from 'enzyme';
import ModalMandatory from './ModalMandatory';
import Text from '../../Texts/Text';

describe('Mandatory Modal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ModalMandatory
        buttonText={'test'}
        headerTitle={'test'}
        onConfirm={() => undefined}
      >
        <Text>test</Text>
      </ModalMandatory>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
