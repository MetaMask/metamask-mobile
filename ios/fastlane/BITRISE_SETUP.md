# Bitrise Setup Guide for iOS TestFlight Upload

This guide explains how to configure Bitrise to use the `ios_main_to_testflight_pipeline` pipeline that uploads iOS builds to TestFlight.

## Prerequisites

1. **App Store Connect API Key** - You need to have created an API key in App Store Connect
2. **Access to Bitrise** - You need admin/owner access to configure secrets
3. **The .p8 key file** - Downloaded from App Store Connect

## Step 1: Get Your App Store Connect API Key Information

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Keys** tab
3. If you don't have a key yet, click **Generate API Key**:
   - Name it (e.g., "Bitrise TestFlight Upload")
   - Select **App Manager** or **Admin** role
   - Click **Generate**
   - **Download the .p8 file** (you can only download it once!)
   - Note the **Key ID** (e.g., `ABC123DEF4`)
   - Note the **Issuer ID** (shown at the top of the Keys page, e.g., `12345678-1234-1234-1234-123456789012`)

## Step 2: Configure Bitrise Secrets

1. Go to your Bitrise project
2. Navigate to **Workflows** → **Secrets** (or **Settings** → **Secrets**)
3. Add the following three secrets:

### Secret 1: `BITRISE_APP_STORE_CONNECT_API_KEY_ISSUER_ID`
- **Type**: Secret Text
- **Value**: Your Issuer ID from App Store Connect (e.g., `12345678-1234-1234-1234-123456789012`)
- **Example**: `12345678-1234-1234-1234-123456789012`

### Secret 2: `BITRISE_APP_STORE_CONNECT_API_KEY_KEY_ID`
- **Type**: Secret Text
- **Value**: Your Key ID from App Store Connect (e.g., `ABC123DEF4`)
- **Example**: `ABC123DEF4`

### Secret 3: `BITRISE_APP_STORE_CONNECT_API_KEY_KEY_CONTENT`
- **Type**: Secret Text
- **Value**: The **entire contents** of your downloaded `.p8` file
- **How to get it**:
  ```bash
  # On your local machine, run:
  cat /path/to/AuthKey_XXXXXXXXXX.p8
  # Copy the entire output (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)
  ```
- **Important**: 
  - Include the header and footer lines
  - Copy the entire file content, including newlines
  - The content should look like:
    ```
    -----BEGIN PRIVATE KEY-----
    MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
    ... (more lines) ...
    -----END PRIVATE KEY-----
    ```

## Step 3: Verify the Pipeline Exists

1. In Bitrise, go to **Workflows** → **Pipelines**
2. Verify that `ios_main_to_testflight_pipeline` appears in the list
3. If it doesn't, make sure you've committed the `bitrise.yml` changes to your repository

## Step 4: How It Works

The `build_ios_main_rc` workflow now **automatically** uploads to TestFlight after building:

1. **`build_ios_main_rc`** runs and builds the IPA
2. **`upload_ios_main_to_testflight`** automatically runs after the build completes
3. The upload workflow:
   - Sets up API keys from Bitrise secrets
   - Finds the IPA file from the build output
   - Uploads to TestFlight's "MetaMask Preview" group

### Manual Testing (Optional)

If you want to test the upload workflow separately, you can still use the standalone pipeline:

1. Go to **Workflows** → **Pipelines**
2. Find `ios_main_to_testflight_pipeline`
3. Click **Start Pipeline**
4. **Note**: This requires an IPA from a previous `build_ios_main_rc` build to exist

## Step 5: Verify Upload Success

1. After the pipeline completes, check the Bitrise logs for:
   - ✅ "App Store Connect API Key configured"
   - ✅ "Found IPA at: ..."
   - ✅ "Uploading to TestFlight..."
   - ✅ Success message from Fastlane

2. Go to [App Store Connect](https://appstoreconnect.apple.com/) → **TestFlight**
3. Navigate to your app → **iOS Builds**
4. You should see the new build processing (takes 10-30 minutes)
5. Once processed, it should appear in the **MetaMask Preview** external testing group

## Troubleshooting

### Error: "BITRISE_APP_STORE_CONNECT_API_KEY_ISSUER_ID secret is not set"
- **Solution**: Make sure you've added all three secrets in Bitrise
- Check the secret names match exactly (case-sensitive)

### Error: "IPA file not found"
- **Solution**: 
  - If using automatic upload: Make sure `build_ios_main_rc` completed successfully
  - The IPA should be in `ios/build/output/` directory
  - Check that `BITRISE_APP_STORE_IPA_PATH` is set (from `_ios_build_template`)
  - If using standalone pipeline: Ensure a previous `build_ios_main_rc` build exists

### Error: "Authentication failed" or "Unauthorized"
- **Solution**:
  - Verify the API key has the correct permissions (App Manager or Admin)
  - Check that the `.p8` file content was copied correctly (including headers)
  - Ensure the Key ID and Issuer ID are correct
  - Verify the API key hasn't been revoked in App Store Connect

### Error: "Group 'MetaMask Preview' not found"
- **Solution**:
  - Verify the group name matches exactly (case-sensitive)
  - Check that the group exists in App Store Connect → TestFlight → External Testing
  - Ensure the API key has permissions to manage TestFlight groups

## Security Best Practices

1. **Never commit secrets** - All API keys are stored in Bitrise secrets, not in code
2. **Rotate keys periodically** - Consider rotating API keys every 6-12 months
3. **Use least privilege** - Only grant the minimum permissions needed (App Manager is usually sufficient)
4. **Monitor usage** - Check App Store Connect for API key usage logs

## Pipeline Flow

### Automatic Upload (Recommended)

When `build_ios_main_rc` runs:
```
build_ios_main_rc workflow
  └── _ios_build_template (builds IPA)
  └── upload_ios_main_to_testflight (automatic)
      ├── Setup App Store Connect API Key (from secrets)
      ├── Find IPA file (from build output)
      ├── Upload to TestFlight via Fastlane
      └── Cleanup API Key file
```

### Standalone Pipeline (Optional)

For manual testing, you can use:
```
ios_main_to_testflight_pipeline
  └── upload_ios_main_to_testflight_stage
      └── upload_ios_main_to_testflight workflow
          ├── Setup App Store Connect API Key (from secrets)
          ├── Find IPA file (searches ios/build/output)
          ├── Upload to TestFlight via Fastlane
          └── Cleanup API Key file
```

## Related Files

- `ios/fastlane/Fastfile` - Contains the `upload_to_testflight_only` lane
- `bitrise.yml` - Contains the pipeline and workflow definitions
- `.github/workflows/build-ios-upload-to-testflight.yml` - Similar setup for GitHub Actions (reference)

## Need Help?

- Check Bitrise build logs for detailed error messages
- Verify Fastlane is working: `bundle exec fastlane list_testflight_groups` (locally)
- Review App Store Connect API documentation: https://developer.apple.com/documentation/appstoreconnectapi

