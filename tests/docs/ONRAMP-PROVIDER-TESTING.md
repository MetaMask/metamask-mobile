# On-Ramp Provider Manual Testing Guide

This guide covers how to manually test the on-ramp providers (Transak and MoonPay) in the staging environment. It outlines the staging setup, how to locate and use provider-specific test data, the UX flow for each provider, and a general framework for testing other providers.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Understanding Provider Types](#understanding-provider-types)
- [How to Find Provider Test Data](#how-to-find-provider-test-data)
- [UX Flow — Getting to Buy](#ux-flow--getting-to-buy)
- [Testing Transak (Native Flow)](#testing-transak-native-flow)
  - [Transak Test Data](#transak-test-data)
  - [Transak UX Walkthrough](#transak-ux-walkthrough)
- [Testing MoonPay (Aggregator / WebView Flow)](#testing-moonpay-aggregator--webview-flow)
  - [MoonPay Test Data](#moonpay-test-data)
  - [MoonPay UX Walkthrough](#moonpay-ux-walkthrough)
- [Testing Other Providers](#testing-other-providers)
- [Troubleshooting](#troubleshooting)

---

## Overview

The on-ramp flow in MetaMask Mobile allows you to buy crypto using fiat payment methods. There are two provider integration types:

| Type           | Description                                                       | Providers |
| -------------- | ----------------------------------------------------------------- | --------- |
| **Native**     | In-app KYC/OTP flow — checkout is handled entirely inside the app | Transak   |
| **Aggregator** | Opens the provider's widget in an in-app browser (WebView)        | MoonPay   |

All manual staging tests should be run against a **non-production build** of the app. Non-production builds automatically target MetaMask's staging (UAT) Ramps backend, which connects to each provider's own staging environment.

> **Important:** Do not use real payment credentials. All testing should use test card numbers and staging accounts provided by each provider.

---

## Prerequisites

Before testing, confirm the following:

- You are using a **non-production build** of the app (debug, QA, or RC build targeting staging)
- The following **remote feature flags** are active on your build:

  | Flag                | Purpose                                        |
  | ------------------- | ---------------------------------------------- |
  | `rampsUnifiedBuyV1` | Enables the Buy button entry point             |
  | `rampsUnifiedBuyV2` | Enables the V2 provider/quote flow             |
  | `depositConfig`     | Required for the Transak native (deposit) flow |

  If the Buy button is missing, these flags are likely inactive on your build. Check with the team or enable them via a local override.

- Your device's **region is supported**. The staging environment is confirmed to work for:
  - United States (California)
  - France
  - Spain
  - Saint Lucia

---

## Understanding Provider Types

The flow you experience after selecting a quote depends on the provider type:

- **Native** — Everything happens in-app. You complete KYC, OTP verification, and order submission entirely within MetaMask without opening a browser. _(Transak)_
- **Aggregator** — The app opens the provider's checkout widget in an in-app browser (WebView). You complete the entire payment experience inside their widget. _(MoonPay)_

This matters for testing because the steps, required test data, and observable behavior differ between the two.

---

## How to Find Provider Test Data

Each provider maintains a separate staging or sandbox environment with test credentials. Below is a general guide for what you need and where to find it.

### What "test data" means for on-ramp providers

- **Staging account** — an account you register with the provider's developer portal, scoped to their sandbox environment
- **Test card numbers** — Visa/Mastercard numbers that trigger success, decline, or 3DS challenge scenarios without a real charge
- **Test identity data** — name, address, phone, and email you use for KYC screens (staging providers typically accept any valid-format data)
- **OTP bypass** — some providers accept a static code (e.g., `000000`) in their sandbox instead of a real SMS/email OTP
- **Provider API key** — required for some native flows; you can find this in the `depositConfig` feature flag or the provider's developer dashboard

### Where to get it

| Provider         | Where to look                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transak**      | [Transak Staging Documentation](https://docs.transak.com/docs/test-credentials) — refer to their documentation for staging test credentials.                                       |
| **MoonPay**      | [MoonPay Staging Documentation](https://dev.moonpay.com/docs/faq-sandbox-testing) — refer to their test documentation for sandbox credentials.                                     |
| **Any provider** | Check the provider's official developer documentation for a "sandbox," "test environment," or "testing" section. Most will list test Visa/Mastercard numbers for common scenarios. |

> **Tip:** When testing a new provider for the first time, confirm whether they have a sandbox environment (isolated test data) vs. a staging environment (shared with QA). Some providers have both. Always use the most isolated environment available.

---

## UX Flow — Getting to Buy

All on-ramp tests start from the same entry point regardless of provider:

1. Open the app and log in
2. From the **Wallet** screen, tap the **Buy** button in the action bar
3. The **Fund** sheet appears — tap **Buy**
4. The **Token Select** screen appears — select the token you want to buy (e.g., ETH)
5. The app detects your region and fetches available quotes
6. The **Build Quote** screen shows the available quote — review the amount, fee, and provider name
   - From this screen you can change the **payment type** (e.g., debit/credit card, Apple Pay) and switch between available **providers**
   - In staging, all valid providers will have **(Staging)** appended to their name (e.g., "Transak (Staging)", "Moonpay (Staging)"). Only select providers with this suffix — any provider without it is not in the staging environment
7. Tap **Continue** to proceed to the provider-specific checkout

---

## Testing Transak (Native Flow)

Transak's integration runs entirely in-app — it is a native experience. No WebViews open; instead you move through each step as a native screen inside MetaMask.

### Transak Test Data

You will need:

- A **Transak staging account** registered at the Transak developer portal
- The **email address** associated with that account (used for OTP)
- A **test card number** from Transak's sandbox documentation
- **Test identity data** for KYC fields (any valid-format name, address, and phone number)

> Check Transak's sandbox docs for whether a static OTP bypass code is available. In their staging environment a fixed 6-digit code is sometimes accepted in place of a real email OTP.

### Transak UX Walkthrough

After tapping **Continue** on the Build Quote screen:

1. **Verify Identity** — You are shown Transak's KYC requirement screen; tap **Continue**
2. **Email entry** — enter your Transak staging account email; tap **Continue**
3. **OTP entry** — Transak sends a code to your email; enter it (or use the staging bypass code if available)
4. **Personal details** — if this is your first time, you are prompted for name, address, and phone; fill in valid test data
5. **KYC confirmation** — your identity status is verified and the flow proceeds automatically if approved
6. **Quote confirmation** — you see the final breakdown: crypto amount, fiat total, and fees
7. **Order placement** — confirm the order; it is submitted to Transak's staging environment
8. **Order details screen** — you see a summary with token amount, total fiat, and fees
9. **Activity tab** — your order appears under **Transfers** and transitions from **Pending** → **Completed**

**What to verify:**

- [ ] OTP screen appears and accepts the staging code
- [ ] KYC screen shows the correct status after identity check
- [ ] Order details screen shows the correct token, amount, and provider name ("Transak (Staging)")
- [ ] Order appears in the Activity tab
- [ ] Order status reaches **Completed**

---

## Testing MoonPay (Aggregator / WebView Flow)

MoonPay's integration opens their checkout widget in an in-app browser. You enter the flow from MetaMask and return to it automatically on completion — everything in between happens inside MoonPay's widget.

### MoonPay Test Data

You will need:

- A **test card number** from MoonPay's sandbox documentation
- A **test email** for MoonPay account creation inside the widget (if prompted)
- Any valid **identity data** if MoonPay's KYC flow is triggered during checkout

> MoonPay's sandbox typically provides Visa and Mastercard numbers for success, decline, and 3DS challenge scenarios. Check their developer docs for the current list.

**Important timing note:** MoonPay's custom order ID expires after **60 seconds**. Once the widget opens, complete the checkout flow without a long pause — if you leave the widget idle too long, the order may fail with an expiration error.

### MoonPay UX Walkthrough

After tapping **Continue** on the Build Quote screen:

1. **In-app browser opens** — MoonPay's checkout widget loads inside the app
2. **Widget checkout** — inside the widget, you will:
   - Enter your payment card details (use a MoonPay staging test card)
   - Verify your email and create or log into a MoonPay account if prompted
   - Complete any KYC or identity steps required by MoonPay
   - Confirm the purchase
3. **Callback handled** — on completion, MoonPay redirects you back to MetaMask automatically
4. **Order details screen** — you see the order summary with token amount, fiat total, and provider name
5. **Activity tab** — your order appears under **Transfers** and transitions from **Pending** → **Completed**

**What to verify:**

- [ ] In-app browser opens and MoonPay widget loads correctly
- [ ] Test card is accepted and payment completes within the widget
- [ ] You are returned to the Order Details screen automatically after widget completion (no manual navigation needed)
- [ ] Order details show the correct token, amount, and provider name ("Moonpay (Staging)")
- [ ] Order appears in the Activity tab
- [ ] Order status reaches **Completed**

---

## Testing Other Providers

The on-ramp system supports multiple providers. When testing a provider not covered in this guide, use the following steps:

### 1. Confirm the provider is available in your region

The providers shown depend on your detected region. If the expected provider does not appear on the quote screen, confirm your device region is one the provider supports. You can change your region in system settings and relaunch the app.

### 2. Identify the flow type

Look at which screen appears after you tap Continue:

- **KYC / identity / OTP screens in-app** → native flow (follow the same pattern as Transak)
- **In-app browser opens** → aggregator flow (follow the same pattern as MoonPay)

### 3. Get staging credentials from the provider

Follow the same approach described in [How to Find Provider Test Data](#how-to-find-provider-test-data):

- Register for a sandbox account at the provider's developer portal
- Collect test card numbers for success and failure scenarios
- Gather test identity data if KYC is required
- Confirm whether OTP has a bypass in their sandbox

### 4. Run through the same verification checklist

Regardless of provider, verify:

- [ ] Provider name appears correctly on the Build Quote and Order Details screens
- [ ] Checkout completes without errors using your test credentials
- [ ] Order Details screen shows the correct token, amounts, and fees
- [ ] Order appears in the Activity tab under **Transfers**
- [ ] Order status reaches **Completed**

---

## Troubleshooting

**Buy button is not visible**
Confirm `rampsUnifiedBuyV1` and `rampsUnifiedBuyV2` feature flags are active on your build. These are required for the Buy entry point to appear.

**No providers or quotes returned**
Your detected region may not be supported. Verify your device's region is set to a supported country (US, France, Spain, or Saint Lucia) and relaunch the app.

**Transak KYC flow fails or loops**
Verify you are using a registered Transak staging account email. If the OTP is not arriving, check whether Transak's sandbox has a bypass code in their documentation.

**MoonPay widget fails to load or returns an error**
The order ID has a 60-second expiration. If you delayed starting the widget after the quote was fetched, go back and start the flow again. Also confirm MoonPay's sandbox environment is accessible from your network.

**Order stuck in Pending and never reaches Completed**
This typically means the provider's staging environment has not confirmed the order. Wait a few minutes and pull to refresh in the Activity tab. If it does not resolve, check whether the staging provider processed the transaction on their side.

**Wrong provider shown or preferred provider not auto-selected**
Provider selection is based on your most recent order history. To test a specific provider, clear your order history from app state or use a fresh wallet fixture.
