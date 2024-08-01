import performance, { PerformanceObserver } from 'react-native-performance';

const setupPerformanceObservers = (setNativeLaunch, setRunJsBundle) => {
  new PerformanceObserver((list, observer) => {
    const entries = list.getEntries();
    if (entries.find((entry) => entry.name === 'runJsBundleEnd')) {
      performance.measure(
        'nativeLaunch',
        'nativeLaunchStart',
        'nativeLaunchEnd',
      );
      performance.measure('runJsBundle', 'runJsBundleStart', 'runJsBundleEnd');

      // Retrieve the measurements
      const nativeLaunch = performance.getEntriesByName('nativeLaunch');
      const runJsBundle = performance.getEntriesByName('runJsBundle');
      /* eslint-disable no-console */ console.log(
        'Native Launch:',
        nativeLaunch,
      );
      /* eslint-disable-next-line no-console */ console.log(
        'Run JS Bundle:',
        runJsBundle,
      );

      // Update state with the measurements
      setNativeLaunch(nativeLaunch);
      setRunJsBundle(runJsBundle);
    }

    // if (entries.find((entry) => entry.name === 'contentAppeared')) {
    //   performance.measure(
    //     'contentAppeared',
    //     'nativeLaunchStart',
    //     'contentAppeared',
    //   );

    //   // Retrieve the measurement
    //   const contentAppeared = performance.getEntriesByName('contentAppeared');

    //   // Update state with the measurement
    //   setContentAppeared(contentAppeared);
    // }
  }).observe({ type: 'react-native-mark', buffered: true });
};

export default setupPerformanceObservers;

// create marks
// create observers
// measure marks
// get measured data
