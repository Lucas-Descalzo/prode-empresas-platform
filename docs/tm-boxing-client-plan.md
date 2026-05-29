# TM Boxing client plan

## Current branch context

- Production was resynced after commit `ea200e6` (`UX: simplificar Partidos, corregir ordinales y acentos`).
- Current review branch: `chore/post-deploy-sync-review`
- `main` is clean and aligned with `origin/main`.
- The previous bracket/mobile polish work is no longer pending locally; it was already committed and deployed.
- The next auth/admin work should start in a fresh feature branch from the deployed state.

## Post-deploy functional check

- `/c/[slug]/partidos` is still the real private entrypoint and login gate.
- `/c/[slug]/liga` still renders the ranking without forcing login.
- `/c/[slug]/admin` still focuses on official results only.
- The disabled-session safety fix is still present in `lib/corporate/db.ts`.
- No working-tree drift was detected during the post-deploy sync review.

## What already exists in the codebase

- Corporate users already live in `company_users`.
- User status already supports `invited`, `active`, and `disabled`.
- Passwords already live in `company_user_credentials` with hashed storage.
- Participant session already exists via cookie in `lib/corporate/session.ts`.
- `/c/[slug]/partidos` already requires login and forces password change on first access.
- `/c/[slug]/liga` already renders the tenant leaderboard from server data.
- Global operator tooling already exists in `/admin` for tenant creation, user import, and password reset.
- Tenant admin tooling already exists in `/c/[slug]/admin` for official results.

## New client requirements

- Around 300 users for this tenant.
- Owners want a menu with participant totals.
- Owners want to disable users.
- Users should be able to create their own account.
- The invite should happen through a link that owners can share.
- Registration should collect name, last name, maybe DNI, and password.
- The ranking should be visible only after login.
- The ranking should include search.

## Recommended product decisions

### 1. Registration model

Recommendation: use invite-link signup, not open signup and not corporate-domain signup.

Why:

- The client wants owners to control who gets access.
- Many gym/community users may not share a single email domain.
- It is a better fit than the current `corporate_domain_signup` mode.

Recommended registration fields:

- first name
- last name
- email
- password
- DNI optional at first release

Recommendation on DNI:

- Keep it optional in v1 unless the client has a clear operational use for it.
- If they only want a uniqueness hint, email is simpler and lower friction.
- If they insist on DNI, store it as nullable text and treat it as sensitive personal data.

### 2. Ranking privacy

Recommendation: require participant session on `/c/[slug]/liga`.

Expected behavior:

- Logged out user visiting `/c/[slug]/liga` should see the same private login gate used by `/partidos`.
- Logged in user can see the full ranking.
- Disabled users should lose access immediately on the next request.

### 3. Ranking search

Recommendation: add a client-side search box over the server-rendered ranking table.

Why:

- 300 users is still a comfortable size for in-memory filtering on the client.
- It avoids introducing backend pagination/search complexity too early.

Suggested UX:

- Search by name and email.
- Keep the logged-in user highlighted as `vos`.
- Keep the row count visible near the search input.

### 4. Owner menu

Recommendation: grow `/c/[slug]/admin` into a tenant owner console instead of creating a second tenant-private backoffice.

Suggested owner sections:

- Results
- Participants
- Access link
- Ranking summary

Suggested participant metrics:

- total users
- active users
- invited users
- disabled users
- completed predictions

### 5. Disable user behavior

Recommendation: disabling a user should not delete their prediction history.

Expected behavior:

- disabled users cannot log in
- disabled users disappear from active ranking
- existing predictions stay in the database for audit and possible restore
- owners can re-enable the user later if needed

## Technical implementation plan

## Phase 1: private ranking + participant management baseline

Goal: solve the client-visible privacy and user-control gaps first.

Files likely involved:

- `app/c/[slug]/liga/page.tsx`
- `components/corporate/login-form.tsx`
- `components/corporate/corporate-header.tsx`
- `components/corporate/admin-panel.tsx`
- `app/c/[slug]/admin/page.tsx`
- `app/c/[slug]/admin/actions.ts`
- `lib/corporate/db.ts`
- `lib/corporate/session.ts`

Scope:

- gate leaderboard behind login
- add leaderboard search UI
- add participant counts in tenant admin
- add disable/enable user actions in tenant admin

Note:

- Session safety was partially tightened by filtering disabled users out of `getCompanyUserById`.

## Phase 2: invite-link signup

Goal: let owners share a controlled registration path.

Recommended new routes/files:

- `app/c/[slug]/registro/page.tsx`
- `app/c/[slug]/registro/actions.ts`
- `components/corporate/signup-form.tsx`
- `lib/corporate/db.ts`
- `lib/corporate/types.ts`

Recommended data model additions:

- `company_invite_links`
  - `id`
  - `company_id`
  - `token_hash`
  - `label`
  - `expires_at`
  - `max_uses`
  - `used_count`
  - `status`
- `company_users.document_id` nullable
- `company_users.registered_at` nullable

Recommended flow:

1. Owner creates or rotates an invite link from tenant admin.
2. User opens `/c/[slug]/registro?token=...`.
3. User completes self-signup.
4. Account starts as `active` without temporary password.
5. User is redirected to `/c/[slug]/partidos`.

## Phase 3: owner experience polish

Goal: make the tenant owner area feel complete for launch.

Scope:

- searchable participant table
- copyable invite link card
- participant status filters
- last login display
- confirmation before disable
- maybe export participant list

## Data and security notes

- 300 users is fine for the current stack if we stay simple.
- Search can be client-side in v1.
- Leaderboard query paths already filter disabled users.
- Signup tokens should be hashed at rest, not stored in plain text.
- If we collect DNI, we should keep it nullable and avoid displaying it in ranking/admin by default.

## Open decisions to confirm with the client

- Is email mandatory for login? Recommendation: yes.
- Is DNI really needed on day one? Recommendation: no, or optional.
- Do they want one shared invite link per tenant or rotatable invite links? Recommendation: rotatable invite links.
- Should tenant owners have their own login inside the tenant, or keep using the current admin password model for now? Recommendation: keep current model for v1, then move to owner accounts if needed.
- Should disabled users remain visible in admin history? Recommendation: yes.

## Suggested delivery order

1. Refresh this plan after each deployed milestone so branch assumptions do not go stale.
2. Build private ranking plus search.
3. Add tenant participant management with disable/enable.
4. Build invite-link signup.
5. Polish owner UX and copy for launch.

## Recommended next slice

The clearest next slice is still `tenant access and privacy baseline`, but now from the deployed state.

Suggested scope for that slice:

- require participant session on `/c/[slug]/liga`
- preserve the current `partidos` login flow as the shared gate
- add client-side ranking search
- avoid touching tenant admin yet unless the ranking work needs shared helpers

Why this remains the best next step:

- it solves a direct client requirement already confirmed
- it is smaller and safer than starting with invite-link signup
- it keeps the owner-panel expansion separate from participant-facing access changes
