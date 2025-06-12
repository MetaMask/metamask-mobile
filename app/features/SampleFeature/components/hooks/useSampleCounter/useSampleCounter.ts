import {useState} from 'react';

/**
 * Sample useSampleCounter hook
 *
 * @sampleFeature do not use in production code
 */
function useSampleCounter(initial = 0) {

    // TODO - implement the redux counter logic here instead of useState
    // use react toolkit see engine reducer /app/core/redux/slices/inpageProvider/index.ts
    const [count, setCount] = useState(initial);
    const increment = () => setCount(prev => prev + 1);

    return {
        get value() {
            return count;
        },
        increment,
    };
}

export default useSampleCounter;
