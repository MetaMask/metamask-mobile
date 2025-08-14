import React from 'react';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { Box, Text } from '@metamask/design-system-react-native';

import Routes from '../../../../../../constants/navigation/Routes';
import TabBar from '../../../../../../component-library/components-temp/TabBar/TabBar';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { useWallets } from '../../../hooks/send/useWallets';
import { RecipientList } from '../../recipient-list';

export const Recipient = () => {
  const wallets = useWallets();
  useSendNavbar({ currentRoute: Routes.SEND.RECIPIENT });

  return (
    <Box twClassName="flex-1 px-4">
      <ScrollableTabView renderTabBar={() => <TabBar />}>
        <Box
          key="your-accounts"
          {...{ tabLabel: 'Your Accounts' }}
          twClassName="flex-1"
        >
          <RecipientList wallets={wallets} />
        </Box>
        <Box key="contacts" {...{ tabLabel: 'Contacts' }} twClassName="flex-1">
          <Text>
            Contacts - will be implemented in separate PR - Intentional empty
          </Text>
        </Box>
      </ScrollableTabView>
    </Box>
  );
};
