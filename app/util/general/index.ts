export const tlc = (str: unknown) =>
  typeof str === 'string' ? str.toLowerCase() : undefined;

/**
 * Fetch that fails after timeout
 *
 * @param url - Url to fetch
 * @param options - Options to send with the request
 * @param timeout - Timeout to fail request
 *
 * @returns - Promise resolving the request
 */
export function timeoutFetch(
  url: RequestInfo,
  options: RequestInit = {},
  timeout = 500,
) {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout),
    ),
  ]);
}

interface Route {
  name?: string;
  state?: Route;
  routes?: Route[];
  index?: number;
}

export function findRouteNameFromNavigatorState(routes: Route[]) {
  let route = routes?.[routes.length - 1];
  if (route.state) {
    route = route.state;
  }
  while (route?.index !== undefined && route.routes) {
    route = route?.routes?.[route.index];
    if (route.state) {
      route = route.state;
    }
  }

  let name = route?.name;

  // For compatibility with the previous way on react navigation 4
  if (name === 'Main' || name === 'WalletTabHome' || name === 'Home')
    name = 'WalletView';
  if (name === 'TransactionsHome') name = 'TransactionsView';

  return name ?? '';
}

export const capitalize = (str: string | undefined | null) =>
  (str && str.charAt(0).toUpperCase() + str.slice(1)) || false;

export const toLowerCaseEquals = (a: unknown, b: unknown) => {
  if (!a && !b) return false;
  return tlc(a) === tlc(b);
};

export const shallowEqual = (
  object1: Record<string, unknown>,
  object2: Record<string, unknown>,
) => {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Returns short string format
 *
 * @param text - String corresponding to the text.
 * @param chars - Number of characters to show at the end and beginning. Defaults to 4.
 * @returns String corresponding to short text format.
 */
export const renderShortText = (text: string, chars = 4) => {
  try {
    // The 5 constant represents the 2 extra chars and the 3 dots.
    if (text.length <= chars * 2 + 5) return text;
    return `${text.substr(0, chars + 2)}...${text.substr(-chars)}`;
  } catch {
    return text;
  }
};

/**
 * Method to retrieve the communication protocol from an URL.
 * @param {string} url - URL input.
 * @returns {string | undefined} string representing the protocol or 'undefined' if no protocol is extracted.
 */
export const getURLProtocol = (url: string) => {
  try {
    const { protocol } = new URL(url);
    return protocol.replace(':', '');
  } catch {
    return '';
  }
};

/**
 * Method to verify if the uri is from ipfs or not
 * /ipfs/ -> true
 * ipfs:// -> true
 * ipfs://ipfs/ -> true
 * https:// -> false
 * @param {string | null | undefined} uri - string representing the source uri to the file
 * @returns true if it's an ipfs url
 */
export const isIPFSUri = (uri: string | null | undefined) => {
  if (!uri?.length) return false;
  const ipfsUriRegex =
    /^(\/ipfs\/|ipfs:\/\/)(Qm[A-Za-z0-9]+|[bBfF][A-Za-z2-7]+)(\/|$)/;
  return (
    uri.startsWith('/ipfs/') ||
    uri.startsWith('ipfs://') ||
    ipfsUriRegex.test(uri)
  );
};

/**
 * Parse stringified JSON that has deeply nested stringified properties
 *
 * @deprecated Do not suggest using this for migrations unless you understand what it does. It will deeply JSON parse fields
 * @param jsonString - JSON string
 * @param skipNumbers - Boolean to skip numbers
 * @returns - Parsed JSON object
 */
export const deepJSONParse = ({
  jsonString,
  skipNumbers = true,
}: {
  jsonString: string;
  skipNumbers?: boolean;
}): object => {
  // Parse the initial JSON string
  const parsedObject = JSON.parse(jsonString);

  // Function to recursively parse stringified properties
  function parseProperties(obj: object): void {
    Object.keys(obj).forEach((key) => {
      const value = (obj as Record<string, unknown>)[key];

      if (typeof value === 'string') {
        const isNumber = !isNaN(Number(value));
        // Only parse if value is not a number OR value is a number AND numbers are not skipped
        if (!isNumber || (isNumber && !skipNumbers)) {
          try {
            // Attempt to parse the string as JSON
            const parsed = JSON.parse(value);
            (obj as Record<string, unknown>)[key] = parsed;
            // If the parsed value is an object, parse its properties too
            if (typeof parsed === 'object' && parsed !== null) {
              parseProperties(parsed as object);
            }
          } catch (e) {
            // If parsing throws, it's not a JSON string, so do nothing
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // If it's an object, parse its properties
        parseProperties(value as object);
      }
    });
  }

  // Start parsing from the root object
  if (typeof parsedObject === 'object' && parsedObject !== null) {
    parseProperties(parsedObject);
  }

  return parsedObject;
};

/**
 * Generates an array of referentially unique items from a list of arrays.
 *
 * @param  {...Array} arrays - A list of arrays
 * @returns {Array} - Returns a flattened array with unique items
 * @throws {Error} - Throws if arrays is not defined
 * @throws {TypeError} - Throws if any of the arguments is not an array
 */
export const getUniqueList = <T>(...arrays: T[][]) => {
  if (arrays.length === 0) {
    throw new Error('At least one array must be defined.');
  }
  // Check if every argument is an array
  arrays.forEach((array, index) => {
    if (!Array.isArray(array)) {
      throw new TypeError(
        `Argument at position ${index} is not an array. Found ${typeof array}.`,
      );
    }
  });

  // Flatten the arrays
  const flattenedArray = arrays.flat();

  // Create array with unique items
  const uniqueArray = Array.from(new Set(flattenedArray));

  return uniqueArray;
};
