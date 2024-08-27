/* eslint-disable no-console */
/* eslint-disable react/display-name */
import React from 'react';

// Internal dependencies.
import { default as SheetHeaderComponent } from './SheetHeader';
import { SAMPLE_SHEETHEADER_PROPS } from './SheetHeader.constants';

const SheetHeaderMeta = {
  title: 'Component Library / Sheet',
  component: SheetHeaderComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SHEETHEADER_PROPS.title,
    },
    actionButtonlabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SHEETHEADER_PROPS.actionButtonOptions?.label,
    },
  },
};
export default SheetHeaderMeta;

export const SheetHeader = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: ({ title, actionButtonlabel }: any) => (
    <SheetHeaderComponent
      title={title}
      onBack={SAMPLE_SHEETHEADER_PROPS.onBack}
      actionButtonOptions={{
        label: actionButtonlabel,
        onPress: () => console.log('label clicked'),
      }}
    />
  ),
};
