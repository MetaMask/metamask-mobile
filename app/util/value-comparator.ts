/**
 * Returns a function with arity 1 that caches the argument that the function
 * is called with and invokes the comparator with both the cached, previous,
 * value and the current value. If specified, the initialValue will be passed
 * in as the previous value on the first invocation of the returned method.
 *
 * @template A - The type of the compared value.
 * @param comparator - A method to compare
 * the previous and next values.
 * @param [initialValue] - The initial value to supply to prevValue
 * on first call of the method.
 */
export function previousValueComparator<A>(
    comparator: (previous: A, next: A) => boolean,
    initialValue: A,
  ) {
    let first = true;
    let cache: A;
    return (value: A) => {
      try {
        if (first) {
          first = false;
          return comparator(initialValue ?? value, value);
        }
        return comparator(cache, value);
      } finally {
        cache = value;
      }
    };
  }
  