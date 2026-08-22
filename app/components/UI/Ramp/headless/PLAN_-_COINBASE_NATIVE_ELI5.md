# Coinbase Native, explained in plain language

> Plain-language companion to the technical plan. For the full detail, read [the technical plan](./PLAN_-_COINBASE_NATIVE.md). This file says the same things in everyday words for someone who does not work on payments or crypto plumbing. Every "Snippet" below is copied from a real source (repo code or the plan itself), with a pointer to where it came from. Nothing here is invented.

## The one-paragraph version

MetaMask Mobile lets people buy crypto with regular money (this is called an "on-ramp"). One of the sellers, Coinbase, is turning off the version where a person can buy as a "guest" (without signing in) on a web page that Coinbase builds and runs for us. To keep guest buying working, our app has to build the guest screens itself and talk to Coinbase through a set of behind-the-scenes instructions (an "API": a way for two computer systems to talk). That guest path will only support the phone's built-in pay buttons, Apple Pay and Google Pay. Anything else (typing in a card, bank transfers) will require signing in to Coinbase. This is mobile-only for now, and the new guest path stays completely separate from the old signed-in Coinbase.

## Plain-word cheat sheet

A few words show up over and over. Here is what they mean in this doc:

- **On-ramp:** buying crypto with normal money inside the app.
- **Guest checkout:** buying without creating or signing into an account.
- **Hosted:** Coinbase builds and runs the payment web page for us.
- **Headless:** Coinbase gives us the plumbing (an API) and we build the screens ourselves.
- **API:** an agreed way for two systems to send requests and answers to each other.
- **Provider:** a company that actually sells the crypto (Coinbase, Transak).
- **Quote:** a price estimate for a purchase before you commit.
- **Create Order:** the final "buy now" request that locks in the deal.
- **Verification / OTP:** a one-time code sent to your email or phone to prove it is really you. OTP means "one-time password".
- **Token (bearer token):** a digital pass that proves the app is signed in and allowed to make a request.
- **Backend / server-side:** code that runs on our own servers, not on the user's phone.
- **Polling:** asking "is it done yet?" on a repeating timer.
- **Vault:** the phone's locked drawer for secrets, tied to that one device.
- **Kill switch:** a remote on/off switch we can flip without shipping a new app.

---

## Background and scope

**In plain terms:** Coinbase is retiring the old "we host the guest page for you" option, so we have to host guest buying ourselves. The new guest path only does Apple Pay and Google Pay, and it lives side by side with the old signed-in Coinbase without merging into it.

The important facts:

- Coinbase says the hosted guest checkout is deprecated (being retired) on June 30, 2026. The wording is still future-tense and not confirmed as switched on yet, so step one is to confirm the real status.
- An earlier date, July 31, 2025, was about a different requirement (needing a session token) and is not the guest-checkout deadline.
- The new guest path ("Headless") only supports Apple Pay on iPhone and Google Pay on Android. It cannot take a typed-in card or a bank transfer. People who need those can sign in to Coinbase or pick another provider.
- Mobile-only is our own choice, not a Coinbase limit. The browser extension stays on the old signed-in Coinbase.
- We must keep the two Coinbase options visible as two separate things. We must not tell the app that one is a stand-in for the other, because they accept different payment methods and hiding one could hide the only option that fits the user.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Headless is the only future Coinbase guest path. Its public Create Order contract supports Apple Pay and Google Pay guest enums only. It does not provide typed-card entry or ACH.

---

## How the pieces fit together

**In plain terms:** The phone shows the screens, a shared library in the middle keeps track of the order, our own server does all the secret talking to Coinbase, and only the tiniest bit of recovery info is kept on the phone.

The flow is a chain: the phone app, then a shared "ramps controller" library that tracks quotes and order status, then our own on-ramp server, and finally Coinbase. All the sensitive parts (Coinbase passwords, Coinbase's responses, turning a user into a private ID, order creation, checking order status) happen on our server, never on the phone.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Coinbase credentials, CDP responses, partner identity derivation, verification calls, order creation, and authenticated order status calls stay server-side. Mobile stores only the minimum recovery state in device-only secure storage.

("CDP" is the Coinbase Developer Platform, meaning Coinbase's own backend responses.)

---

## Phase 0: answer the open questions before building

**In plain terms:** Before we build anything for real, we have to pin down what Coinbase actually supports and prove the phone's pay buttons really work. Phase 1 does not start until these are settled.

### Things we still need Coinbase to confirm

**In plain terms:** This is a list of "we think this is true, but Coinbase has to confirm it in writing" items. Treat each as a question, not a fact.

Open questions include: whether the June 30, 2026 retirement is actually switched on yet; whether Google Pay is truly ready end to end (so we keep it turned off until proven); how long email verification lasts; whether verification codes can be reused across orders; whether Coinbase supports a safety tag that stops a repeated request from creating two orders; what the fees are; and the exact names of the status messages Coinbase sends.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Confirm production readiness for Google Pay across Create Order, guest quote, lifecycle events, approval, and commercial access. Coinbase documentation and API behavior are inconsistent, so keep Google Pay disabled until the answer is written and tested.

### Prove the phone pay buttons actually work

**In plain terms:** Our app opens payment pages inside a mini in-app browser. A setting we turn on for that mini-browser can change how Apple Pay talks back to the app, so we have to test on a real phone that the pay sheet opens and that we hear back when it finishes. A Coinbase demo app is not proof, because it uses different settings than we do.

The setting in question really is on in our checkout code today. Here is the real line that turns Apple Pay on in the in-app browser view:

**Snippet** (verbatim from `metamask-mobile`, `app/components/UI/Ramp/Views/Checkout/Checkout.tsx`, lines 826-829):

<!-- prettier-ignore -->
```tsx
          allowsInlineMediaPlayback
          enableApplePay
          paymentRequestEnabled
          mediaPlaybackRequiresUserAction={false}
```

The plan's rule: only start a payment when the user taps the button themselves. Never auto-tap or script the pay sheet.

### Agree on one shape for quotes and orders

**In plain terms:** All three parts of the system (phone, middle library, server) must agree on exactly what a price estimate and an order look like, so nobody gets confused. The price on the final order is the real price, even if the earlier estimate was different.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Treat Create Order as the final price. Replace stale quote amounts, fees, exchange rate, and totals with the returned order values before persisting or displaying them.

### Turn a user into a private, one-way ID

**In plain terms:** Coinbase needs a tag to group one person's orders, but we do not want to hand over who they are. So our server scrambles the user's ID into a code that cannot be un-scrambled, and it keeps the recipe secret. Every Coinbase request must be signed in; there is no anonymous shortcut.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> `partnerUserRef` is a server-derived, non-reversible identifier
> Require the profile bearer token for every Coinbase auth, order, and status route. There is no anonymous fallback.

("Non-reversible" means you cannot work backward from the code to the real person. A "bearer token" is the digital pass that proves the request is signed in.)

### Terms, settings, and how the app lists the provider

**In plain terms:** We record which version of the legal terms a user agreed to and exactly when. We set up the new Coinbase option in our provider list with its own name and logo, and we add a remote on/off switch so we can shut it off quickly.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Add a server-side enable flag and check it at discovery, send-OTP, verify-OTP, quote, Create Order, and status endpoints. Account for public provider-response caching when defining shutoff behavior.

("OTP" is the one-time code. "Caching" means an old copy of the answer may be reused for a while, so the off switch has to account for that delay.)

---

## Phase 1: ship the working guest flow

**In plain terms:** Build the real thing: a US-only guest buy through Coinbase, with our server in the middle for safety, clear privacy limits, order state that can be recovered, and no change to how Transak or signed-in Coinbase behave.

### Backend (our on-ramp server): sign-in codes and verification

**In plain terms:** Our server gets two new doors: one to send a one-time code and one to check it. It passes the code request through to Coinbase without keeping the email, phone, or codes itself.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Proxy Coinbase managed verification without storing email, phone, OTPs, or verification IDs server-side.

("Proxy" here means pass the request through on the user's behalf without holding onto the sensitive parts.)

### Backend: quotes and orders

**In plain terms:** The server asks Coinbase for a price, checks that everything is valid, creates the order, and hands back a normalized order plus a payment link. The final Coinbase numbers win over the earlier estimate.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Return a normalized order and payment link. Final Coinbase amounts and fees replace quote-time values.

### Backend: safe order status

**In plain terms:** Checking an order's status must be locked to the right person and the right wallet, so nobody can peek at someone else's order even if they somehow knew its ID. If the app is locked, we pause and wait rather than dropping the sign-in requirement.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Reject cross-profile or wrong-wallet status access even when a Coinbase order ID is known.

### Backend: privacy in the logs

**In plain terms:** We must make it impossible for private data (email, phone, codes, payment links, sign-in passes) to end up in our logs or monitoring, and we write tests that fail if any of it ever leaks.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Prohibit logging email, phone, OTPs, verification IDs, payment links, session tokens, authorization headers, and Coinbase CDP responses by construction.

("By construction" means built so it cannot happen, not just a rule people try to follow.)

### Backend: stuck orders and no risky retries

**In plain terms:** Coinbase might leave an order stuck as "processing" forever. So we keep a small recovery note, stop asking after a deadline, mark it incomplete without making up a status, and check again later. We do not auto-retry a request when we are unsure whether it went through, because that could create a duplicate order.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Stop active polling after a Coinbase-specific deadline. Mark the local record incomplete or abandoned without inventing a Coinbase status.

### Middle library (ramps controller): pick the right provider

**In plain terms:** The shared library that auto-picks a provider needs to stop assuming the only "native" seller is Transak. It should match on payment method and support more than one native provider. Only the automatic-selection logic changes; when a user picks a provider by hand, nothing changes.

The library today already has a step that looks for a native provider and uses it. This is the real code that finds a native provider during automatic selection (the plan extends this so more than one native provider is possible):

**Snippet** (verbatim from the `core` monorepo, `packages/ramps-controller/src/RampsController.ts`, lines 2273-2279):

<!-- prettier-ignore -->
```ts
    // 3. A native provider (e.g. Transak Native).
    const nativeProvider = supporting.find(
      (provider) => provider.type === 'native',
    );
    if (nativeProvider) {
      return [nativeProvider.id];
    }
```

### Mobile: send the user down the right path

**In plain terms:** Today the app treats every "native" purchase as Transak. We need it to route by which provider it actually is, so a Coinbase native quote goes to Coinbase screens instead of Transak screens.

Here is the real spot that decides the route today. Any native quote goes to the same `continueNative` handler (which is Transak's path):

**Snippet** (verbatim from `metamask-mobile`, `app/components/UI/Ramp/hooks/useContinueWithQuote.ts`, lines 384-393):

<!-- prettier-ignore -->
```ts
  const continueWithQuote = useCallback(
    async (quote: Quote, context: ContinueWithQuoteContext) => {
      if (isNativeProvider(quote)) {
        await continueNative(quote, context);
        return;
      }
      await continueWidget(quote, context);
    },
    [continueNative, continueWidget],
  );
```

### Mobile: what the phone remembers

**In plain terms:** The phone keeps a little bit of recovery info in its locked, device-only drawer: when the email and phone checks expire (tracked separately), and the note needed to look up an order later. It never keeps the actual codes, payment links, or sign-in passes.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Never store OTP values, payment links, bearer tokens, or CDP responses in the vault.

### Mobile: agree to terms, then buy

**In plain terms:** Show a Coinbase terms screen and record the exact version and time the user accepted. Only create the order after email, US phone, and terms all pass. Then open the payment link in the mini-browser proven in Phase 0, and let the middle library's status checks be the source of truth.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Create the order only after email, US phone, and terms requirements pass.

### Mobile: limits and where it works

**In plain terms:** Start with US and USD only, using the phone's pay button. Show Coinbase's real spending limits. Do not promise the higher limit as if it were the default.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> The documented default is a $500 rolling seven-day limit and 15 lifetime transactions. Eligible users may upgrade to $2,500 and unlimited lifetime transactions.

### Mobile: how we test it

**In plain terms:** Use an internal test screen to run real quotes against the Coinbase test setup and watch the status messages (with private data hidden). Add automated tests for the Coinbase pieces, and re-run Transak's existing tests to prove we did not break it.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Re-run the existing Transak native suites to prove its wrappers and vault behavior did not change.

---

## Phase 2: hardening and the Transak move

**In plain terms:** After we know how Coinbase behaves in the real world, tidy up recovery and coexistence, and only then reuse the new sign-in-code doors for Transak. That Transak move is kept separate from the Coinbase launch.

### Coinbase hardening

**In plain terms:** Double-check that both Coinbase options still show up as two distinct entries everywhere, keep an eye on edge cases, and only build heavier machinery (like Coinbase notifying us of changes) if the simpler polling proves not enough.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Add webhook ingestion, durable server storage, HMAC verification, replay protection, idempotency, and out-of-order reconciliation only if polling evidence justifies that system.

(A "webhook" is Coinbase calling us when something changes, instead of us repeatedly asking.)

### Move Transak's sign-in codes to the shared doors

**In plain terms:** Once the legal sign-off is cleared, move Transak's one-time-code steps onto the same server doors we built for Coinbase. Keep the rest of Transak (its identity checks and orders) out of scope, and do this as its own change with its own tests.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Keep KYC, user details, and order proxying out of scope.

("KYC" means "know your customer", the identity checks a provider runs.)

---

## The safety rules (security and privacy)

**In plain terms:** Keep Coinbase secrets and traffic on our server, require sign-in on every sensitive request, tie every order to both the private ID and the wallet, collect only what Coinbase needs, and never let private data leak into logs or crash reports.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Bind order access to both derived profile identity and destination wallet.

---

## On purpose left for later (Deferred)

**In plain terms:** Some things are intentionally postponed unless real-world evidence shows we need them, such as Coinbase change-notifications, the higher-limit upgrade screen, and a shared secrets drawer for all native providers.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Coinbase verification or order webhooks unless polling evidence requires them.

---

## Not part of this work (Out of scope)

**In plain terms:** This project does not touch signed-in Coinbase, does not build a typed-card replacement, does not bring this to the browser extension, and does not merge or hide either Coinbase option.

**What the plan actually says** (from [PLAN\_-_COINBASE_NATIVE.md](./PLAN_-_COINBASE_NATIVE.md)):

> Setting `nativeCounterpart` or hiding either Coinbase provider through brand deduplication.

("Brand deduplication" would mean the app deciding two Coinbase entries are the same brand and quietly showing only one. We must not do that here.)
