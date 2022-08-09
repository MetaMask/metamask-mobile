// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean, text } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';

// Internal dependencies.
import SheetHeader from './SheetHeader';

storiesOf('Component Library / SheetHeader', module).add('Default', () => {
  const groupId = 'Props';
  const includesOnBack = boolean('Includes onBack', false, groupId);
  const includesActionButtonOptions = boolean(
    'Includes actionButtonOptions',
    false,
    groupId,
  );
  const onBack = includesOnBack ? action('onPress') : undefined;
  const onPress = action('onPress');
  const actionButtonLabel = includesActionButtonOptions
    ? text('actionButtonOptions.label', 'Action', groupId)
    : '';
  const titleLabel = text('title', 'Title', groupId);
  const actionButtonOptions = includesActionButtonOptions
    ? {
        label: actionButtonLabel,
        onPress,
      }
    : undefined;

  return (
    <SheetHeader
      onBack={onBack}
      actionButtonOptions={actionButtonOptions}
      title={titleLabel}
    />
  );
});
