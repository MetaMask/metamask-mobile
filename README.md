# metamask-mobile App Config
A hosted JSON object that can be fetched to get information that needs to come from a third party source.

| Version | Status | Link |
|---------|--------|------------------------------------------------------------------------|
| 1 | stable | https://metamask.github.io/metamask-mobile/AppConfig/v1/AppConfig.json |
| test | test | https://metamask.github.io/metamask-mobile/AppConfig/test/MockAppConfig.json |

## Getting Started

```console
$ curl https://metamask.github.io/metamask-mobile/AppConfig/v1/AppConfig.json

{
  "security":{
    "minimumVersions": {
      "appMinimumBuild": 700,
      "appleMinimumOS": 6,
      "androidMinimumAPIVersion": 21
    }
  }
}

```

## App Config API

#### `security.minimumVersions`
- The current minimum supported app and operating system versions.
```json
{
  "security":{
    "minimumVersions": {
      "appMinimumBuild": 700,
      "appleMinimumOS": 6,
      "androidMinimumAPIVersion": 21
    }
  }
}
```

## Testing
A mock endpoint can be found at `AppConfig/test/MockAppConfig.json`. This endpoint can be used to populate test values for QA without changing the stable values. To test minimum values logic, open a PR with values higher than the current stable release values. Once merged, you can query the the test endpoint at [https://metamask.github.io/metamask-mobile/AppConfig/test/MockAppConfig.json](https://metamask.github.io/metamask-mobile/AppConfig/test/MockAppConfig.json) and verify that the mobile app performs accordingly.

```json
{
  "security":{
    "minimumVersions": {
      "appMinimumBuild": 972,
      "appleMinimumOS": 6,
      "androidMinimumAPIVersion": 21
    }
  }
}
```