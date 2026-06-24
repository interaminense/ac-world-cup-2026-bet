# Knockout-Phase Participants & Ranking — Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development or executing-plans. Steps use `- [ ]`.

**Goal:** New people join the knockout phase (Google + admin approval); a zeroed `/knockout` ranking for approved participants; group leaderboard untouched.

**Tech:** Vite 7, React 19, TS, Tailwind 4, Vitest (node-env → pure logic only), Firebase RTDB. Reuse `scorePrediction`, `dataPath`, `useKnockout`, `useKnockoutPicks`.

## Global Constraints

- Commits `--no-gpg-sign`, title-only, on `develop`. **Do not push.**
- Rules file edited, **not deployed**; demo node is open.
- Pure-logic tests only; UI/hooks verified by build + tsc + demo.

---

### Task 1: Profile/Approval types + pure standings logic (TDD)

**Files:** Modify `src/lib/profiles.ts`; create `src/lib/knockoutStandings.ts` + `src/lib/knockoutStandings.test.ts`.

- [ ] `profiles.ts`: extend `Profile` with `nickname?: string | null; wantsKnockout?: boolean;` and `Approval` with `knockout?: boolean;`.
- [ ] `knockoutStandings.ts`:
  - `knockoutRoster(profiles, approvals, participants): {name: string; uid: string}[]` — include uid when `approvals[uid].knockout === true` OR (`approvals[uid].participant` set and not `blocked`). Name = participant name for a claim (match `participantSlug(p.name) === approval.participant`), else `profile.nickname || profile.name`. Skip blocked. Sort by name.
  - `pendingKnockout(profiles, approvals): {email: string; name: string; uid: string}[]` — `profile.wantsKnockout === true` AND not `(approvals[uid].knockout === true)` AND not `approvals[uid].blocked`. Name = `nickname || name`. Sort by name.
  - `buildKnockoutStandings(roster, picksByUid, matches): {exact; name; played; points; rank; uid}[]` — per roster row, over `matches` where `scoreA != null && scoreB != null`, if a pick exists add `scorePrediction(pick.p1, pick.p2, scoreA, scoreB)`, count played and exacts (points === 25). Sort by points desc, exact desc, name; ranks with ties (equal points share a rank).
- [ ] Tests: roster includes knockout-approved + claim-approved, excludes blocked, resolves names; pending filters approved/blocked; standings sum/sort/rank with an exact (25) and a miss (0), zero for no picks.
- [ ] Run `npx vitest run src/lib/knockoutStandings.test.ts` → fail then pass.
- [ ] Commit `Add knockout roster, pending, and standings logic`.

---

### Task 2: Own-profile + admin write hooks

**Files:** Modify `src/lib/useAuth.ts`, `src/lib/useProfiles.ts`, `src/lib/useKnockoutPicks.ts`, `src/lib/firebase.ts` (if a helper is needed).

- [ ] `useAuth`: add `setNickname(nickname: string)` → `set(ref(db, profiles/<uid>/nickname), nickname || null)`; `requestKnockout()` → `set(ref(db, profiles/<uid>/wantsKnockout), true)`. Both no-op when anonymous. Add to the returned `AuthState`.
- [ ] `useProfiles`: add `approveKnockout(uid)` → `update(approvals/<uid>, {knockout: true})`; `rejectKnockout(uid)` → `set(profiles/<uid>/wantsKnockout, null)`. Expose raw `profiles` and `approvals` in the return.
- [ ] `useKnockoutPicks`: also return `byUid` (the raw `tree`).
- [ ] Verified by Task 5 build. Commit `Add nickname, knockout request, and approval write hooks`.

---

### Task 3: Profile screen

**Files:** Create `src/components/ProfileView.tsx`; modify `src/components/Header.tsx` (+ `onProfile` prop) and `src/App.tsx` (route `/profile`, pass `onProfile`, wire `setNickname`/`requestKnockout`/status).

- [ ] `ProfileView`: avatar + Google name; nickname text input with a Save (`setNickname`); knockout status — not signed in → sign-in CTA; approved → "✅ no mata-mata"; pending → "⏳ aguardando aprovação"; else a "Participar do mata-mata" button (`requestKnockout`).
- [ ] `Header`: make the avatar/name a button calling `onProfile` (optional prop).
- [ ] `App`: `<Route path="/profile" element={<ProfileView .../>} />`; header `onProfile={() => navigate('/profile')}`.
- [ ] Commit `Add profile screen with nickname and knockout opt-in`.

---

### Task 4: Knockout Stage ranking menu

**Files:** Create `src/components/KnockoutLeaderboard.tsx`; modify `src/lib/nav.ts`, `src/App.tsx`.

- [ ] `nav.ts`: add `{icon: '🥇', label: 'Knockout Stage', to: '/knockout'}` after Leaderboard.
- [ ] `App`: subscribe to `profiles` (like `approvals`); `const knockoutRosterRows = knockoutRoster(profiles, approvals, participants)`; `const knockoutStandings = buildKnockoutStandings(knockoutRosterRows, byUid, knockoutMatches)`; route `/knockout` → `<KnockoutLeaderboard rows={knockoutStandings} youUid={auth.user?.uid ?? null} />`.
- [ ] `KnockoutLeaderboard`: rank · avatar · name · `exact exatos · played jogos` · points; highlight the viewer's row; empty state "Sem pontos ainda — o ranking aparece quando o mata-mata começar."
- [ ] Commit `Add Knockout Stage ranking menu`.

---

### Task 5: Admin sign-ups + RTDB rules

**Files:** Modify `src/components/AdminView.tsx`, `database.rules.json`.

- [ ] `AdminView`: add a "Knockout sign-ups" section above users — `pendingKnockout(profiles, approvals)` rows with Approve (`approveKnockout`) / Reject (`rejectKnockout`). Uses the raw `profiles`/`approvals` now exposed by `useProfiles`.
- [ ] `database.rules.json`: under `profiles/$uid` add `"nickname": {".validate": "newData.isString() || !newData.exists()"}` and `"wantsKnockout": {".validate": "newData.isBoolean() || !newData.exists()"}`; add top-level `"knockoutPicks": {".read": true, "$uid": {".write": "auth != null && auth.uid === $uid"}}`. Do NOT deploy.
- [ ] `npx tsc --noEmit` + `npm run build` + `npx vitest run` green.
- [ ] Commit `Add knockout sign-up approvals and RTDB rules`.

---

### Final: verify on demo (no push)

- [ ] On `?demo`: sign in → `/profile` set nickname + request knockout; in Admin approve; the user shows in `/knockout` at 0; #76 (Brazil 2–1 Croatia) gives points to whoever picked it. Screenshot. Do NOT push.

## Self-Review

Coverage: new-user join (T2 request + T5 approve), admin section (T5), zeroed ranking (T1 standings + T4 menu), nickname on profile (T2+T3), group leaderboard untouched (no edits to ranking.ts/`/`), approval gates pool (T1 roster), rules (T5). Types: `Profile`/`Approval` extended in T1 used by T2/T5; `knockoutRoster`/`pendingKnockout`/`buildKnockoutStandings` consistent T1↔T4↔T5; `byUid` added T2 used T4.
