import React from 'react';
import { shallow } from 'enzyme';
import ConfirmationModal from './ConfirmationModal';
import { ConfirmationModalVariant } from './ConfirmationModal.types';

describe('ConfirmationModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ConfirmationModal
        route={{
          params: {
            onConfirm: () => null,
            variant: ConfirmationModalVariant.Normal,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  // it('should be checked when selected', () => {
  //   const wrapper = shallow(
  //     <MultiselectListItem isSelected>
  //       <View />
  //     </MultiselectListItem>,
  //   );
  //   const checkboxComponent = wrapper.childAt(0);
  //   const isSelected = checkboxComponent.props().isSelected;
  //   expect(isSelected).toBe(true);
  // });
  // it('should not be checked when not selected', () => {
  //   const wrapper = shallow(
  //     <MultiselectListItem isSelected={false}>
  //       <View />
  //     </MultiselectListItem>,
  //   );
  //   const checkboxComponent = wrapper.childAt(0);
  //   const isSelected = checkboxComponent.props().isSelected;
  //   expect(isSelected).toBe(false);
  // });
});
