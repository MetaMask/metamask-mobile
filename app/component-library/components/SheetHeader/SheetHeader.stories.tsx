import React from 'react';
import { storiesOf } from '@storybook/react-native';
import SheetHeader from './SheetHeader';
import { boolean, text } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';

storiesOf('Component Library / SheetHeader', module).add('Default', () => {
  const groupId = 'Props';
  const includesOnBack = boolean('Includes onBack', false, groupId);
  const includesActionOptions = boolean(
    'Includes actionOptions',
    false,
    groupId,
  );
  const onBack = includesOnBack ? action('onPress') : undefined;
  const onPress = action('onPress');
  const actionButtonLabel = includesActionOptions
    ? text('actionOptions.label', 'Action', groupId)
    : '';
  const titleLabel = text('title', 'Title', groupId);
  const actionOptions = includesActionOptions
    ? {
        label: actionButtonLabel,
        onPress,
      }
    : undefined;

  return (
    <SheetHeader
      onBack={onBack}
      actionOptions={actionOptions}
      title={titleLabel}
    ></SheetHeader>
  );
});
