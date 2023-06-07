import React from 'react';
import { render } from '@testing-library/react-native';
import SnapPermissionCell from '../SnapPermissionCell';
import {
  SNAP_PERMISSIONS_DATE,
  SNAP_PERMISSIONS_TITLE,
  SNAP_PERMISSION_CELL,
} from '../../../../../../constants/test-ids';

describe('SnapPermissionCell', () => {
  const defaultProps = {
    title: 'Permission Title',
    date: 1686005090788,
  };

  const setup = (props = defaultProps) => {
    const utils = render(<SnapPermissionCell {...props} />);
    const permissionCell = utils.getByTestId(SNAP_PERMISSION_CELL);
    const permissionTitle = utils.getByTestId(SNAP_PERMISSIONS_TITLE);
    const permissionDate = utils.getByTestId(SNAP_PERMISSIONS_DATE);

    return {
      ...utils,
      permissionCell,
      permissionTitle,
      permissionDate,
    };
  };

  test('renders correctly', () => {
    const { permissionCell, permissionTitle, permissionDate } = setup();

    const expectedDate = 'Approved on Jun 5 at 6:44 pm';

    expect(permissionCell).toBeDefined();
    expect(permissionTitle.props.children).toEqual(defaultProps.title);
    expect(permissionDate.props.children).toEqual(expectedDate);
  });

  test('displays custom title and secondary text', () => {
    const customProps = {
      title: 'Custom Title',
      date: 1686005090788,
    };
    const expectedDate = 'Approved on Jun 5 at 6:44 pm';
    const { permissionTitle, permissionDate } = setup(customProps);

    expect(permissionTitle.props.children).toEqual(customProps.title);
    expect(permissionDate.props.children).toEqual(expectedDate);
  });
});
