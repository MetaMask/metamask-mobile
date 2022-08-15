# metamask-mobile App Config
A hosted JSON object that can be fecthed to get information that needs to come from a third party source.

| Version | Status | Link                                                                   |
|---------|--------|------------------------------------------------------------------------|
| 1       | stable | https://metamask.github.io/metamask-mobile/AppConfig/v1/AppConfig.json |

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
- The current mimimum supported app and operating system versions.
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
