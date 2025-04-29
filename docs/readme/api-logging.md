# API Call Logging

MetaMask Mobile provides functionality to log API calls, which is useful for debugging and testing purposes. This feature is available for all build types.

## Using the API Monitor

The recommended way to monitor API calls is to use the dedicated API monitoring script. This provides detailed logging of all API requests and responses.

### Enabling The Monitor

You can enable API call logging by setting the `LOG_API_CALLS=true` environment variable when starting the app:

```bash
LOG_API_CALLS=true yarn start:ios
# or
LOG_API_CALLS=true yarn start:android
# or any other build variant
```

### Running the API Monitor

1. Open a new terminal window
2. Run the following command:
```bash
yarn start:api-logging-server
```

The monitor will start and display:
- The port it's running on
- Detailed logs for all API calls including:
  - Request method and URL
  - Request headers
  - Request body
  - Response status code and message
  - Response headers
  - Response body

### Stopping the Monitor

To stop the API monitor, press `Ctrl+C` in the terminal where it's running.

## E2E Tests

For E2E tests, API logging is automatically enabled. You don't need to set any additional environment variables.

## Implementation Details

The API call logging functionality is implemented using the following components:

1. A fetch interceptor in `shim.js` that routes all API calls through a proxy
2. The `LOG_API_CALLS` environment variable that enables this functionality
3. For E2E tests, this is automatically enabled by the `isTest` condition
4. The API monitor script uses `mockttp` to intercept and log all API calls

When using the API monitor, you'll see detailed logs in the console showing:
- All API requests with their methods, URLs, headers, and bodies
- All API responses with their status codes, headers, and bodies
- Pretty-formatted JSON for better readability

This is particularly useful for:
- Debugging API-related issues
- Understanding the network traffic of the app
- Verifying that API calls are being made correctly 