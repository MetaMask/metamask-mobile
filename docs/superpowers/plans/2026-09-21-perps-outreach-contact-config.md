# Perps Outreach Contact Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve Perps outreach contact destinations from Terminal and consume them in the mobile bottom sheet while showing icon-free actions in one row.

**Architecture:** Terminal stores a required nested `contact` object in the outreach campaign and returns it with eligible banners. Mobile parses the object with a rollout-safe `null` default and the bottom sheet consumes the existing React Query cache rather than static constants.

**Tech Stack:** NestJS, Superstruct, Vitest, React Native, TanStack Query, Jest, TypeScript.

## Global Constraints

- Contact fields are exactly `email`, `telegramUsername`, and `calendlyUrl`.
- Terminal campaign values are optional; when present they are non-empty strings.
- Mobile has no static fallback for missing contact configuration.
- Telegram continues to open externally; Calendly continues to open in the in-app browser.
- Buttons have no icons and use horizontal alignment.
- Use Yarn only.

---

### Task 1: Terminal campaign contact contract

**Files:**

- Modify: `/Users/alejandro/dev/terminal-backend/src/outreach/outreach.types.ts`
- Modify: `/Users/alejandro/dev/terminal-backend/src/outreach/outreach.schema.ts`
- Modify: `/Users/alejandro/dev/terminal-backend/src/outreach/outreach.schema.test.ts`
- Modify: `/Users/alejandro/dev/terminal-backend/data/outreach/campaign.json`

**Interfaces:**

- Produces: `OutreachContact { email: string; telegramUsername: string; calendlyUrl: string }`
- Produces: required `OutreachCampaign.contact: OutreachContact`
- Produces: required `OutreachBanner.contact: OutreachContact`

- [ ] **Step 1: Start a clean backend branch**

Run:

```bash
git checkout main
git pull --ff-only
git checkout -b feat/outreach-contact-config
```

Expected: a new branch based on current `origin/main`.

- [ ] **Step 2: Write failing schema tests**

Add `contact` to the valid fixture and tests proving an omitted contact object
and an empty nested value are rejected:

```typescript
contact: {
  email: 'matthieu.saintolive@consensys.net',
  telegramUsername: '@msainto',
  calendlyUrl: 'https://calendly.com/matthieu-saintolive/30min',
},
```

```typescript
it('rejects a missing contact configuration', () => {
  const { contact: _contact, ...withoutContact } = valid;

  expect(isValidOutreachCampaign(withoutContact)).toBe(false);
});

it('rejects empty contact values', () => {
  expect(
    isValidOutreachCampaign({
      ...valid,
      contact: { ...valid.contact, email: '' },
    }),
  ).toBe(false);
});
```

- [ ] **Step 3: Run the schema test and verify RED**

Run:

```bash
yarn test src/outreach/outreach.schema.test.ts
```

Expected: FAIL because campaigns without `contact` still validate.

- [ ] **Step 4: Add the contact types and schema**

Add:

```typescript
export interface OutreachContact {
  email: string;
  telegramUsername: string;
  calendlyUrl: string;
}
```

Add `contact: OutreachContact` to `OutreachCampaign` and `OutreachBanner`.
Add this required schema field:

```typescript
contact: object({
  email: nonempty(string()),
  telegramUsername: nonempty(string()),
  calendlyUrl: nonempty(string()),
}),
```

Add the three approved values to `data/outreach/campaign.json`.

- [ ] **Step 5: Run the schema test and verify GREEN**

Run:

```bash
yarn test src/outreach/outreach.schema.test.ts
```

Expected: PASS.

### Task 2: Terminal response serialization

**Files:**

- Modify: `/Users/alejandro/dev/terminal-backend/src/outreach/outreach.service.ts`
- Modify: `/Users/alejandro/dev/terminal-backend/src/outreach/outreach.service.test.ts`
- Modify: `/Users/alejandro/dev/terminal-backend/test/outreach.http.integration.test.ts`

**Interfaces:**

- Consumes: required `OutreachCampaign.contact`
- Produces: eligible responses with `banner.contact`

- [ ] **Step 1: Write failing service and integration assertions**

Add contact to the test campaign fixture:

```typescript
contact: {
  email: 'matthieu.saintolive@consensys.net',
  telegramUsername: '@msainto',
  calendlyUrl: 'https://calendly.com/matthieu-saintolive/30min',
},
```

Expect the same object under every asserted eligible `banner`, including the
HTTP integration response.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
yarn test src/outreach/outreach.service.test.ts test/outreach.http.integration.test.ts
```

Expected: FAIL because `banner.contact` is absent.

- [ ] **Step 3: Serialize contact**

Add to the eligible banner mapping:

```typescript
contact: this.campaign.contact,
```

- [ ] **Step 4: Run backend verification**

Run:

```bash
yarn test src/outreach/outreach.schema.test.ts src/outreach/outreach.service.test.ts test/outreach.http.integration.test.ts
yarn tscheck
yarn lint
```

Expected: all commands pass.

- [ ] **Step 5: Commit, push, and open the backend PR**

Run:

```bash
git add data/outreach/campaign.json src/outreach test/outreach.http.integration.test.ts
git commit -m "feat(outreach): serve campaign contact configuration"
git push -u origin feat/outreach-contact-config
gh pr create --title "feat(outreach): serve campaign contact configuration" --body-file /tmp/outreach-contact-pr.md
```

Expected: a new Terminal backend pull request URL.

### Task 3: Mobile API contract

**Files:**

- Modify: `app/components/UI/Perps/services/perpsOutreachApi.ts`
- Modify: `app/components/UI/Perps/services/perpsOutreachApi.test.ts`
- Modify: `tests/component-view/api-mocking/perpsOutreach.ts`

**Interfaces:**

- Produces: `PerpsOutreachContact`
- Produces: `PerpsOutreachBanner.contact: PerpsOutreachContact | null`

- [ ] **Step 1: Write failing API tests**

Add a realistic contact object to `BANNER` and verify it round-trips. Add a
separate test where the backend omits `contact` and expect `contact: null`.

- [ ] **Step 2: Run the API test and verify RED**

Run:

```bash
yarn jest app/components/UI/Perps/services/perpsOutreachApi.test.ts --testPathIgnorePatterns .claude/worktrees
```

Expected: FAIL because contact is not part of the parsed banner.

- [ ] **Step 3: Implement the mobile schema**

Add:

```typescript
export interface PerpsOutreachContact {
  email: string;
  telegramUsername: string;
  calendlyUrl: string;
}
```

Add `contact: PerpsOutreachContact | null` to the banner and:

```typescript
contact: defaulted(
  nullable(
    object({
      email: string(),
      telegramUsername: string(),
      calendlyUrl: string(),
    }),
  ),
  null,
),
```

Update the component-view mock with the approved contact object.

- [ ] **Step 4: Run the API test and verify GREEN**

Run the same Jest command. Expected: PASS.

### Task 4: Backend-driven bottom-sheet actions and horizontal footer

**Files:**

- Modify: `app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.tsx`
- Modify: `app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.test.tsx`
- Delete: `app/components/UI/Perps/Views/PerpsOutreachDetailsView/constants.ts`

**Interfaces:**

- Consumes: `usePerpsOutreachBanner().data?.contact`
- Produces: Telegram URL `https://t.me/${telegramUsername.replace(/^@/, '')}`

- [ ] **Step 1: Write failing view tests**

Mock `usePerpsOutreachBanner` with backend contact values that differ from the
old constants. Assert:

- the returned email and Telegram username render;
- Telegram opens the URL derived from the returned username;
- email opens the returned `mailto:` URL;
- Calendly navigation uses the returned URL;
- `BottomSheetFooter` receives `ButtonsAlignment.Horizontal`;
- neither button prop contains `startIconName`;
- contact content and footer are absent when contact is `null`.

- [ ] **Step 2: Run the view test and verify RED**

Run:

```bash
yarn jest app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.test.tsx --testPathIgnorePatterns .claude/worktrees
```

Expected: FAIL because the view still imports static constants, uses vertical
alignment, and supplies icons.

- [ ] **Step 3: Implement backend-driven contact behavior**

Read:

```typescript
const { data: campaign } = usePerpsOutreachBanner();
const contact = campaign?.contact ?? null;
```

Use `contact.email`, `contact.telegramUsername`, and `contact.calendlyUrl` in
the handlers and rendered contact line. Derive the Telegram URL by removing one
leading `@`. Render the contact line and `BottomSheetFooter` only when contact
exists. Remove both `startIconName` properties and set:

```typescript
buttonsAlignment={ButtonsAlignment.Horizontal}
```

Delete the static constants file and imports.

- [ ] **Step 4: Run mobile verification**

Run:

```bash
yarn jest app/components/UI/Perps/services/perpsOutreachApi.test.ts app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.test.tsx --testPathIgnorePatterns .claude/worktrees
NODE_OPTIONS=--max-old-space-size=8192 yarn lint:tsc
NODE_OPTIONS=--max-old-space-size=8192 yarn eslint app/components/UI/Perps/services/perpsOutreachApi.ts app/components/UI/Perps/services/perpsOutreachApi.test.ts app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.tsx app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.test.tsx tests/component-view/api-mocking/perpsOutreach.ts
```

Expected: all commands pass.

- [ ] **Step 5: Review final diffs**

Run:

```bash
git diff --check
git diff -- app/components/UI/Perps/services app/components/UI/Perps/Views/PerpsOutreachDetailsView tests/component-view/api-mocking/perpsOutreach.ts
```

Expected: no whitespace errors; only approved contact and button-layout changes.
