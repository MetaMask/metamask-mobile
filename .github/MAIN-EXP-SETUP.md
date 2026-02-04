# main-exp (Experimental Build) Setup Guide

This guide describes what you need to configure to run **main-exp** builds via GitHub Actions.

## Prerequisites

main-exp produces **signed device builds** (iOS .ipa, Android signed APK). It requires:

1. **GitHub Environment: `build-exp`**
2. **AWS Secrets Manager** secret with signing certificates
3. **OIDC / permissions** for the workflow to assume the AWS role

---

## 1. Create GitHub Environment: `build-exp`

In **Settings → Environments**, create an environment named `build-exp`.

Add the same secrets as other builds (Firebase, Infura, Segment, etc.). You can copy from `build-e2e` or `build-test` since main-exp uses UAT/dev APIs.

---

## 2. AWS Secrets Manager (Account: 363762752069)

### Role

Ensure the role exists and GitHub Actions can assume it:

- **Role ARN:** `arn:aws:iam::363762752069:role/metamask-mobile-uat-signer`
- **Trust policy:** Allow `token.actions.githubusercontent.com` for your repo

### Secret

Create or verify the secret:

- **Secret name:** `metamask-mobile-main-uat-signer`
- **Region:** `us-east-2`

### Secret structure (JSON)

The secret must contain keys that `build.gradle` expects. For main-exp (UAT/internal release), the Android signing config uses:

```json
{
  "ANDROID_KEYSTORE": "<base64-encoded-keystore>",
  "BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD": "<password>",
  "BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS": "<alias>",
  "BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD": "<key-password>"
}
```

For **iOS** device builds, add:

```json
{
  "IOS_SIGNING_KEYSTORE": "<base64-encoded-p12>",
  "IOS_SIGNING_PROFILE": "<base64-encoded-mobileprovision>",
  "IOS_SIGNING_KEYSTORE_PASSWORD": "<p12-password>"
}
```

---

## 3. Trigger the Build

**Manual:** Actions → Build Mobile App → Run workflow → select `main-exp` and platform (`ios`, `android`, or `both`).

**From another workflow:** Call the build workflow with `build_name: main-exp`.

---

## Summary Checklist

- [ ] GitHub Environment `build-exp` exists with required secrets
- [ ] AWS role `metamask-mobile-uat-signer` exists with OIDC trust for your repo
- [ ] AWS secret `metamask-mobile-main-uat-signer` exists in `us-east-2` with the correct keys
- [ ] Workflow has `id-token: write` permission (already in build.yml)
