import URL from 'url-parse';

export const tlc = (str: string | undefined): string | undefined => str?.toLowerCase?.();

/**
 * Fetch that fails after timeout
 *
 * @param url - Url to fetch
 * @param options - Options to send with the request
 * @param timeout - Timeout to fail request
 *
 * @returns - Promise resolving the request
 */
export function timeoutFetch(url: string, options: RequestInit, timeout: number = 500): Promise<Response | Error> {
  return Promise.race([
    fetch(url, options),
    new Promise<Error>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout),
    ),
  ]);
}

export function findRouteNameFromNavigatorState(
  // The exact structure of the routes array is difficult to determine without more context.
  // It's part of the React Navigation state, typically an array of route objects.
  routes: unknown[]
): string | undefined {
  let route: any = routes?.[routes.length - 1];
  if (route.state) {
    route = route.state;
  }
  while (route !== undefined && route.index !== undefined) {
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

  return name;
}
export const capitalize = (str: string): string | false =>
  (str && str.charAt(0).toUpperCase() + str.slice(1)) || false;

export const toLowerCaseEquals = (a: string | undefined, b: string | undefined): boolean => {
  if (!a && !b) return false;
  return tlc(a) === tlc(b);
};

export const shallowEqual = (object1: Record<string, unknown>, object2: Record<string, unknown>): boolean => {
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
export const renderShortText = (text: string, chars: number = 4): string => {
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
export const getURLProtocol = (url: string): string | undefined => {
  try {
    const { protocol } = new URL(url);
    return protocol.replace(':', '');
  } catch {
    return;
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
export const isIPFSUri = (uri: string | null | undefined): boolean => {
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
interface DeepJSONParseOptions {
  jsonString: string;
  skipNumbers?: boolean;
}

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
interface JSONObject { [key: string]: JSONValue }
interface JSONArray extends Array<JSONValue> {}

export const deepJSONParse = ({ jsonString, skipNumbers = true }: DeepJSONParseOptions): JSONValue => {
  // Parse the initial JSON string
  const parsedObject: JSONValue = JSON.parse(jsonString);

  // Function to recursively parse stringified properties
  function parseProperties(obj: JSONObject | JSONArray): void {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'string') {
          const parsedItem = tryParse(item);
          if (parsedItem !== undefined) {
            obj[index] = parsedItem;
          }
        } else if (typeof item === 'object' && item !== null) {
          parseProperties(item);
        }
      });
    } else {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (typeof value === 'string') {
          const parsedValue = tryParse(value);
          if (parsedValue !== undefined) {
            obj[key] = parsedValue;
          }
        } else if (typeof value === 'object' && value !== null) {
          parseProperties(value);
        }
      });
    }
  }

  function tryParse(value: string): JSONValue | undefined {
    const isNumber = !isNaN(Number(value));
    // Only parse if value is not a number OR value is a number AND numbers are not skipped
    if (!isNumber || (isNumber && !skipNumbers)) {
      try {
        // Attempt to parse the string as JSON
        const parsed: JSONValue = JSON.parse(value);
        // If the parsed value is an object or array, parse its properties too
        if (typeof parsed === 'object' && parsed !== null) {
          parseProperties(parsed);
        }
        return parsed;
      } catch (e) {
        // If parsing throws, it's not a JSON string, so return undefined
        return undefined;
      }
    }
    return undefined;
  }

  if (typeof parsedObject === 'object' && parsedObject !== null) {
    parseProperties(parsedObject);
  }

  return parsedObject;
};

/**
 * Returns a new array with all duplicates removed.
 * The order of result values is determined by the order they occur in the arrays.
 *
 * @param {...T[][]} arrays - Arrays to merge and remove duplicates from
 * @returns {T[]} - New array with unique items
 * @throws {Error} - Throws if arrays is not defined
 * @throws {TypeError} - Throws if any of the arguments is not an array
 */
export const getUniqueList = <T>(...arrays: T[][]): T[] => {
  if (arrays.length === 0) {
    throw new Error('At least one array must be defined.');
  }

  arrays.forEach((arr, index) => {
    if (!Array.isArray(arr)) {
      throw new TypeError(
        `Argument at position ${index} is not an array. Found ${typeof arr}.`,
      );
    }
  });

  // Flatten the arrays and create a Set to remove duplicates
  return [...new Set(arrays.flat())];
};
