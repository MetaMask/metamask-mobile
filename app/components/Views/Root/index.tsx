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
import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'blue',
    padding: 10,
    margin: 10,
  },
});

const Button = memo(
  ({ onPress, title }: { onPress: () => void; title: string }) => {
    console.log('TITLE', title);
    return (
      <Pressable style={styles.button} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    );
  },
);

// Global variable to store closures
let leakyClosures: Function[] = [];

// Generate some dummy data
const generateLargeData = () => {
  return new Array(1000).fill(null).map(() => ({
    id: Math.random().toString(),
    data: new Array(500).fill('??').join(''),
    timestamp: new Date().toISOString(),
    nested: {
      moreData: new Array(100).fill({
        value: Math.random(),
        text: 'nested data that consumes memory',
      }),
    },
  }));
};

const createClosure = () => {
  const newDataLeak = generateLargeData(); // Creates large data array
  return () => {
    newDataLeak.forEach((data) => data.id); // Closure captures newDataLeak;
  };
};
// Create many closures that each capture their own large data
const createManyLeaks = () => {
  for (let i = 0; i < 10; i++) {
    const leakyClosure = createClosure();
    leakyClosures.push(leakyClosure); // Store reference to prevent GC
    // Trigger all closures to keep data "active"
    leakyClosures.forEach((closure) => closure());
  }
};

export default () => {
  const [count, setCount] = useState(0);
  const [second, setSecond] = useState(0);

  const onPressHandlerOne = useCallback(() => {
    setCount(count + 1);
  }, [count]);

  const onPressHandlerTwo = useCallback(() => {
    setSecond(second + 1);
  }, [second]);

  return (
    <View style={styles.container}>
      <Text>Welcome!</Text>
      <Text>{count}</Text>
      <Text>{second}</Text>
      <Button onPress={onPressHandlerOne} title="Press one" />
      <Button onPress={onPressHandlerTwo} title="Press two" />
      <TouchableOpacity onPress={createManyLeaks}>
        <Text>Leak Memory</Text>
      </TouchableOpacity>
    </View>
  );
};
