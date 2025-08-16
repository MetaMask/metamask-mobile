# E2E Request Capture and Mock Generation

This tool automatically captures all live API requests **with real response data** during E2E test execution and generates mock files for stable testing.

The system records actual API responses, not synthetic data, making your mocks highly accurate and reliable.

## Quick Start

Use the npm scripts added to `package.json`:

## Usage

Instead of running your regular e2e test:

```bash
# No mocks captured - regular test run script
yarn test:e2e:android:debug:run e2e/specs/notifications/enable-notifications-after-onboarding.spec.ts

# Captures requests and generates mocks
yarn test:e2e:capture:android e2e/specs/notifications/enable-notifications-after-onboarding.spec.ts
```

**Available Commands:**

- `yarn test:e2e:capture:android <test-file>` - Capture requests from Android E2E test
- `yarn test:e2e:capture:ios <test-file>` - Capture requests from iOS E2E test

## How it works

1. **Runs E2E Test**: Executes your test normally with `CAPTURE_MODE=true`
2. **Captures Real Responses**: Mock server logs complete request-response pairs during test execution
3. **Parses Enhanced Logs**: Extracts both URLs and actual API response data from `CAPTURE_REQUEST` logs
4. **Generates Accurate Mocks**: Creates mock files with real API responses (fallback to intelligent generation only when needed)
5. **Creates Documentation**: Generates usage instructions and detailed reports with captured data

## Output Files

After running capture, you'll find:

- **`e2e/api-mocking/captured-mocks/{test-name}-mocks.json`**: Ready-to-use mock events with real API responses
- **`e2e/api-mocking/captured-mocks/{test-name}-requests.json`**: Raw captured request-response data
- **`e2e/api-mocking/captured-mocks/{test-name}-README.md`**: Comprehensive usage guide and request inventory

**⚠️ Important:** The `captured-mocks/` folder is gitignored. Copy the specific mock files you need for your tests to a tracked location (e.g., `e2e/mock-responses/`) before using them.

## Real Response Capture Examples

The system captures actual API responses like:

```json
{
  "urlEndpoint": "https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=usd",
  "method": "GET",
  "responseCode": 200,
  "response": {
    "ETH": {
      "USD": 4284.13
    }
  },
  "_metadata": {
    "capturedAt": "2025-08-11T18:09:16.590Z",
    "duration": 131,
    "realResponse": true
  }
}
```

This ensures that the mocks reflect actual API behavior instead of synthetic responses.

## Using Generated Mocks

**Step 1:** Copy the generated mock file to a tracked location:

```bash
cp e2e/captured-mocks/my-test-mocks.json e2e/mock-responses/my-test-mocks.json
```

**Step 2:** Import the copied mocks in your test:

```javascript
// Import copied mocks (from tracked location)
import mockEvents from '../mock-responses/my-test-mocks.json';

describe('My Test', () => {
  let mockServer;

  beforeAll(async () => {
    // Start mock server with captured events
    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer(mockEvents, mockServerPort);
  });

  // Your test here...
});
```

## Direct Usage

You can also run the extraction script directly:

```bash
# Extract mocks from a specific test
yarn test:e2e:capture:android e2e/specs/my-test.spec.ts
```

## Capture Modes

**Default**:

- Captures real API response data using `CAPTURE_MODE=true`
- Provides actual API responses for maximum accuracy
- Preferred for production use

**Fallback**:

- Falls back to parsing "Request going to live server" warnings if enhanced capture fails
- Generates synthetic responses based on URL patterns
- Used automatically when real responses aren't available

## Troubleshooting

### No requests captured

- Verify the test makes live network requests (check for "Request going to live server" warnings or `CAPTURE_REQUEST` logs)
- Ensure you're running from the correct directory (metamask-mobile root)
- Check that the test runs and produces console output

### Enhanced capture not working

- Look for `CAPTURE_REQUEST:` logs during test execution
- Verify mock server is properly handling the enhanced capture
- Check for header processing errors in logs

### Mock generation fails

- Ensure you have write permissions to `e2e/captured-mocks/`
- Check for Node.js import/export issues (requires `--experimental-modules`)
- Verify Node.js version compatibility

### Test fails but mocks generate

- This is normal - the tool captures requests even if the test fails
- Use the generated mocks to make your test more stable

### Longer running requests not captured

- **Increase wait time**: Set `REQUEST_CAPTURE_WAIT_TIME=20000` (or higher) to wait longer for pending requests
- **Check for timeouts**: Look for timeout warnings in the output - requests taking >30s will timeout
- **Review capture errors**: Check the generated files for any `captureError: true` entries indicating failed captures
- **Test timing**: Consider if requests are initiated very late in the test execution

### Environment Variables for Request Capture

- `REQUEST_CAPTURE_WAIT_TIME`: Milliseconds to wait after test completion for pending requests (default: 10000)
- `CAPTURE_MODE`: Set to 'true' to enable request capture (automatically set by the capture scripts)
