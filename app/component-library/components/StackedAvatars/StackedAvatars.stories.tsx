import React from 'react';
import { storiesOf } from '@storybook/react-native';
import StackedAvatar from '.';

storiesOf(' Component Library / StackedAvatar', module).add('Default', () => {
  const tokenList = [
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '0',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '1',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '2',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '3',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '4',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '5',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '6',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '7',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '8',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '9',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '10',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '11',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '12',
    },
    {
      name: 'Ethereum',
      imageUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      id: '13',
    },
  ];

  return <StackedAvatar tokenList={tokenList} />;
});
