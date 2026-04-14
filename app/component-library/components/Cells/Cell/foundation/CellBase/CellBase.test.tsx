// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import CellBase from './CellBase';
import {
  SAMPLE_CELLBASE_AVATARPROPS,
  SAMPLE_CELLBASE_TITLE,
  SAMPLE_CELLBASE_SECONDARYTEXT,
  SAMPLE_CELLBASE_TERTIARY_TEXT,
  SAMPLE_CELLBASE_TAGLABEL,
} from './CellBase.constants';
import { CellComponentSelectorsIDs } from '../../CellComponent.testIds';

describe('CellBase', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        secondaryText={SAMPLE_CELLBASE_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELLBASE_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELLBASE_TAGLABEL}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Avatar', () => {
    const { queryByTestId } = render(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    expect(queryByTestId(CellComponentSelectorsIDs.BASE_AVATAR)).not.toBe(null);
  });

  it('should render the given title', async () => {
    const wrapper = render(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    expect(await wrapper.findByText(SAMPLE_CELLBASE_TITLE)).toBeDefined();
  });

  it('should render the given secondaryText', async () => {
    const wrapper = render(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        secondaryText={SAMPLE_CELLBASE_SECONDARYTEXT}
      />,
    );
    expect(
      await wrapper.findByText(SAMPLE_CELLBASE_SECONDARYTEXT),
    ).toBeDefined();
  });
  it('should render the given tertiaryText', async () => {
    const wrapper = render(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        tertiaryText={SAMPLE_CELLBASE_TERTIARY_TEXT}
      />,
    );
    expect(
      await wrapper.findByText(SAMPLE_CELLBASE_TERTIARY_TEXT),
    ).toBeDefined();
  });
  it('should render tag with given label', async () => {
    const wrapper = render(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        tagLabel={SAMPLE_CELLBASE_TAGLABEL}
      />,
    );
    expect(await wrapper.findByText(SAMPLE_CELLBASE_TAGLABEL)).toBeDefined();
  });
});
