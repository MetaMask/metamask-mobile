import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

import Fox from '.';
import backgroundShapes from '../Swaps/components/LoadingAnimation/backgroundShapes';

const customStyle = `
  #head {
    height: 30%;
    top: 50%;
    transform: translateY(-50%);
  }
  #bgShapes {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 70%;
    height: 70%;
    transform: translateX(-50%) translateY(-50%) rotate(0deg);
    animation: rotate 50s linear infinite;
  }

  @keyframes rotate {
    to {
      transform: translateX(-50%) translateY(-50%) rotate(360deg);
    }
  }
`;
storiesOf('Components / UI / Fox', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const customContentKnob = boolean('customContent', false);
    return (
      <Fox
        customContent={customContentKnob ? backgroundShapes : ''}
        customStyle={customStyle}
      />
    );
  });
