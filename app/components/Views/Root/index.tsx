// import React, { useEffect, useState } from 'react';
// import { Provider } from 'react-redux';
// import { PersistGate } from 'redux-persist/lib/integration/react';
// import { store, persistor } from '../../../store';
// import App from '../../Nav/App';
// import SecureKeychain from '../../../core/SecureKeychain';
// import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
// import Logger from '../../../util/Logger';
// import ErrorBoundary from '../ErrorBoundary';
// import ThemeProvider from '../../../component-library/providers/ThemeProvider/ThemeProvider';
// import { ToastContextWrapper } from '../../../component-library/components/Toast';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { RootProps } from './types';
// import NavigationProvider from '../../Nav/NavigationProvider';
// import ControllersGate from '../../Nav/ControllersGate';
// import { isTest } from '../../../util/test/utils';
// ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
// import { SnapsExecutionWebView } from '../../../lib/snaps';
// ///: END:ONLY_INCLUDE_IF
// import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

// /**
//  * Top level of the component hierarchy
//  * App component is wrapped by the provider from react-redux
//  */
// const Root = ({ foxCode }: RootProps) => {
//   const [isLoading, setIsLoading] = useState(true);

//   /**
//    * Wait for store to be initialized in Detox tests
//    * Note: This is a workaround for an issue with Detox where the store is not initialized
//    */
//   const waitForStore = () =>
//     new Promise((resolve) => {
//       const intervalId = setInterval(() => {
//         if (store && persistor) {
//           clearInterval(intervalId);
//           setIsLoading(false);
//           resolve(null);
//         }
//       }, 100);
//     });

//   useEffect(() => {
//     if (foxCode === '') {
//       const foxCodeError = new Error('WARN - foxCode is an empty string');
//       Logger.error(foxCodeError);
//     }
//     SecureKeychain.init(foxCode);
//     // Init EntryScriptWeb3 asynchronously on the background
//     EntryScriptWeb3.init();
//     // Wait for store to be initialized in Detox tests
//     if (isTest) {
//       waitForStore();
//     }
//   }, [foxCode]);

//   if (isTest && isLoading) {
//     return null;
//   }

//   return (
//     <SafeAreaProvider>
//       <Provider store={store}>
//         <PersistGate persistor={persistor}>
//           {
//             ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
//             // NOTE: This must be mounted before Engine initialization since Engine interacts with SnapsExecutionWebView
//             <SnapsExecutionWebView />
//             ///: END:ONLY_INCLUDE_IF
//           }
//           <ThemeProvider>
//             <NavigationProvider>
//               <ControllersGate>
//                 <ToastContextWrapper>
//                   <ErrorBoundary view="Root">
//                     <ReducedMotionConfig mode={ReduceMotion.Never} />
//                     <App />
//                   </ErrorBoundary>
//                 </ToastContextWrapper>
//               </ControllersGate>
//             </NavigationProvider>
//           </ThemeProvider>
//         </PersistGate>
//       </Provider>
//     </SafeAreaProvider>
//   );
// };

// export default Root;

import React, { useCallback } from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import Realm from 'realm';
import { RealmProvider, useQuery, useRealm } from '@realm/react';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 *  User type for TS
 */
interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  // name: string;
}

/**
 *  User schema for Realm
 */
const UserSchema: Realm.ObjectSchema = {
  name: 'User',
  primaryKey: 'id',
  properties: {
    id: 'string',
    firstName: 'string',
    lastName: 'string',
    // name: 'string',
  },
};

/**
 *  Realm migration function to process data migrations
 * @param oldRealm - The old realm instance (where old data lives)
 * @param newRealm - The new realm instance (where new data will be stored)
 */
const realmMigration: Realm.MigrationCallback = (oldRealm, newRealm) => {
  if (oldRealm.schemaVersion < 2) {
    // Migrate users to split name into firstName and lastName
    const oldUsers = oldRealm.objects('User');

    for (const oldUser of oldUsers) {
      const oldUserId = oldUser.id as string;
      const oldUserName = oldUser.name as string;
      const newUser = newRealm.objectForPrimaryKey<IUser>('User', oldUserId);
      const [firstName, lastName] = oldUserName.split(' ');
      if (newUser) {
        newUser.firstName = firstName;
        newUser.lastName = lastName;
      }
    }
  }
};

/**
 *  Realm configuration
 */
const realmConfig: Realm.Configuration = {
  schema: [UserSchema],
  schemaVersion: 2,
  // onMigration: realmMigration,
  // deleteRealmIfMigrationNeeded: true,
};

/**
 *  Custom hook to manage users in Realm
 */
const useUsers = () => {
  const realm = useRealm();

  /**
   *  Read users from Realm
   */
  const users = useQuery<IUser>('User');

  /**
   *  Add user to Realm
   */
  const addUser = useCallback(() => {
    realm.write(() => {
      realm.create<IUser>('User', {
        id: Date.now().toString(),
        firstName: 'John',
        lastName: 'Doey',
      });
    });
  }, []);

  /**
   *  Delete user from Realm
   */
  const deleteUser = useCallback((id: string) => {
    realm.write(() => {
      const user = realm.objectForPrimaryKey<IUser>('User', id);
      if (user) {
        realm.delete(user);
      }
    });
  }, []);

  return { users, addUser, deleteUser };
};

const Dummy = () => {
  const { users, addUser, deleteUser } = useUsers();

  console.log('USERS', users);

  return (
    <SafeAreaView style={{ backgroundColor: 'red', flex: 1 }}>
      <FlatList
        keyExtractor={(item) => item.id}
        data={users}
        renderItem={({ item }) => (
          <View>
            <Text>{item.id}</Text>
            <Text>{item.firstName}</Text>
            <Text>{item.lastName}</Text>
            <Button title="Delete User" onPress={() => deleteUser(item.id)} />
          </View>
        )}
      />
      <Button title="Add User" onPress={addUser} />
    </SafeAreaView>
  );
};

const Root = () => {
  return (
    <RealmProvider {...realmConfig}>
      <Dummy />
    </RealmProvider>
  );
};

export default Root;
