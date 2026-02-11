// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// External dependencies.
import { CellComponentSelectorsIDs } from '../../components/Cells/Cell/CellComponent.testIds';
import {
  AvatarVariant,
  AvatarAccountType,
} from '../../../component-library/components/Avatars/Avatar';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { SAMPLE_LIST_ITEM_MULTISELECT_WITH_MENU_BUTTON_PROPS } from '../ListItemMultiSelectWithMenuButton/ListItemMultiSelectWithMenuButton.constants';

// Internal dependencies.
import CellMultiSelectWithMenu from './CellMultiSelectWithMenu';
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';

// Sample props for testing
const SAMPLE_AVATAR_PROPS = {
  variant: AvatarVariant.Account as const,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};

const SAMPLE_CELL_PROPS: CellSelectWithMenuProps = {
  title: 'Test Account',
  avatarProps: SAMPLE_AVATAR_PROPS,
  secondaryText: '0x2990079bcdEe240329a520d2444386FC119da21a',
  tertiaryText: 'Updated 1 sec ago',
  tagLabel: 'Imported',
  isSelected: false,
  withAvatar: true,
  ...SAMPLE_LIST_ITEM_MULTISELECT_WITH_MENU_BUTTON_PROPS,
};

describe('CellMultiSelectWithMenu', () => {
  it('should render correctly with all props', () => {
    const { getByTestId, getByText } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} />,
    );

    // Check if main components are rendered
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_TITLE)).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.TAG_LABEL)).toBeTruthy();

    // Check if text content is displayed
    expect(getByText('Test Account')).toBeTruthy();
    expect(getByText('Imported')).toBeTruthy();
  });

  it('should render without avatar when withAvatar is false', () => {
    const { queryByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} withAvatar={false} />,
    );

    // Avatar should not be rendered
    expect(queryByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeNull();

    // Other elements should still be present
    expect(
      queryByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(queryByTestId(CellComponentSelectorsIDs.BASE_TITLE)).toBeTruthy();
  });

  it('should render with custom title as ReactNode', () => {
    const CustomTitle = () => (
      <View>
        <Text>Custom Title Component</Text>
      </View>
    );

    const { getByTestId } = render(
      <CellMultiSelectWithMenu
        {...SAMPLE_CELL_PROPS}
        title={<CustomTitle />}
      />,
    );

    // Should still render the container
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeTruthy();
  });

  it('should render without tag label when tagLabel is not provided', () => {
    const { queryByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} tagLabel={undefined} />,
    );

    // Tag label should not be rendered
    expect(queryByTestId(CellComponentSelectorsIDs.TAG_LABEL)).toBeNull();

    // Other elements should still be present
    expect(
      queryByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(queryByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeTruthy();
    expect(queryByTestId(CellComponentSelectorsIDs.BASE_TITLE)).toBeTruthy();
  });

  it('should render with children', () => {
    const { getByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS}>
        <View>
          <Text>Custom Child Component</Text>
        </View>
      </CellMultiSelectWithMenu>,
    );

    // Should render children (check that the component renders without error)
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeTruthy();
  });

  it('should render when selected', () => {
    const { getByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} isSelected />,
    );

    // All components should still be rendered
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_TITLE)).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.TAG_LABEL)).toBeTruthy();
  });

  it('should render when disabled', () => {
    const { getByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} isDisabled />,
    );

    // All components should still be rendered
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_TITLE)).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.TAG_LABEL)).toBeTruthy();
  });

  it('should render with title props', () => {
    const { getByTestId } = render(
      <CellMultiSelectWithMenu
        {...SAMPLE_CELL_PROPS}
        titleProps={{ numberOfLines: 2, variant: TextVariant.BodyMD }}
      />,
    );

    // Should render with custom title props
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
    expect(getByTestId(CellComponentSelectorsIDs.BASE_TITLE)).toBeTruthy();
  });

  it('should render with custom style', () => {
    const customStyle = { backgroundColor: 'red' };

    const { getByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} style={customStyle} />,
    );

    // Should render with custom style
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
  });

  it('should render with button props', () => {
    const buttonProps = {
      onButtonClick: jest.fn(),
      textButton: 'Click Me',
      showButtonIcon: true,
      buttonTestId: 'custom-button-test-id',
    };

    const { getByTestId } = render(
      <CellMultiSelectWithMenu
        {...SAMPLE_CELL_PROPS}
        buttonProps={buttonProps}
      />,
    );

    // Should render with button props
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
  });

  it('should render with onTextClick handler', () => {
    const onTextClick = jest.fn();

    const { getByTestId } = render(
      <CellMultiSelectWithMenu
        {...SAMPLE_CELL_PROPS}
        onTextClick={onTextClick}
      />,
    );

    // Should render with text click handler
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
  });

  it('should render with showButtonIcon prop', () => {
    const { getByTestId } = render(
      <CellMultiSelectWithMenu {...SAMPLE_CELL_PROPS} showButtonIcon />,
    );

    // Should render with button icon
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
  });

  it('should render with buttonIcon prop', () => {
    const { getByTestId } = render(
      <CellMultiSelectWithMenu
        {...SAMPLE_CELL_PROPS}
        buttonIcon={IconName.Arrow2Right}
      />,
    );

    // Should render with button icon
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT_WITH_MENU),
    ).toBeTruthy();
  });
});
