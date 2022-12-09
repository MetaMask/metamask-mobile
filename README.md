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

## Using In The Mobile App
There is a handy [useAppConfig](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/hooks/AppConfig/useAppConfig.tsx) hook in the mobile repo that will fetch and parse the AppConfig into a useable typescript object. This hook will return an object with the state of `Loading` or `Error` or `Success` and the values inside the `data` property. You must then check to see if `data` exists in the state before you can interact with the AppConfig.

```typescript
const appConfig = useAppConfig();

if (appConfig.data) {
	console.log(appConfig.data.security.minimumVersions.appMinimumBuild);
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

## Contributing

### Opening an issue/pull request
- **Always add the label** [minimum-versions](https://github.com/MetaMask/metamask-mobile/issues?q=label%3Aminimum-versions+) when modifying the minimum secure versions.

### Changing existing values
This is a relatively simple change. All that is needed is to change the values in the [AppConfig.json](https://github.com/MetaMask/metamask-mobile/blob/gh-pages/AppConfig/v1/AppConfig.json) file to your desired values. There is no need for a new version of the API or any code changes in the mobile repo.
### Changing the schema 
If you want to add/modify fields to the API then you must create a new version of the API by creating a sub directory in the [AppConfig folder](https://github.com/MetaMask/metamask-mobile/tree/gh-pages/AppConfig/) with your desired version number. You must also modify the test endpoint located at `AppConfig/test/MockAppConfig.json` to match the new schema. 

**NOTE** If you are modifying the schema **AND** changing existing values you must also modify the existing values in the older versions of the API.

Change the [README](https://github.com/MetaMask/metamask-mobile/blob/gh-pages/README.md) to document the new API and mark the latest version as stable.

#### Changes required in the mobile codebase
1. Since the [useAppConfig](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/hooks/AppConfig/useAppConfig.tsx) hook will no longer work you must modify the [AppConfig.ts](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/hooks/AppConfig/AppConfig.ts) interface to **exactly** your new JSON object.
2. Then you will need to modify [this logic](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/hooks/AppConfig/useAppConfig.tsx#L22-L30) within the fetch to correctly parse the response to match the new schema.
3. Change the [MM_APP_CONFIG_URL](https://github.com/MetaMask/metamask-mobile/blob/main/app/constants/urls.ts#L34) to the newest endpoint.

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
