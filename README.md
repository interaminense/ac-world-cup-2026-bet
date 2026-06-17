# AC World Cup 2026 BET

Leaderboard for the Analytics Cloud World Cup 2026 betting pool, live at
**<https://interaminense.github.io/ac-world-cup-2026-bet/>**. The shell is a
static site on GitHub Pages and the predictions are CSVs bundled at build time,
but **scores, AI commentary and reactions are realtime** — the browser
subscribes to Firebase Realtime Database and a local poller pushes updates, so
the page changes the instant a goal is scored, with no refresh.

## Views

Each tab is a client-side route (`HashRouter`), so views are shareable and
survive a refresh:

- **🏆 Leaderboard** (`/`) — totals, exact-score count, competition ranking
  (ties share a rank). Click a participant to open their bets.
- **⚽ Matches** (`/matches`) — one card per game, grouped by the viewer's
  local day: kickoff time, live score, everyone's predictions ranked by points,
  and the what-if panel while the match is live.
- **🎯 Bets** (`/bets/:id`, e.g. `/bets/adriano`) — a participant's 72
  predictions with real scores, status, and per-match points color-coded by
  tier. Deep-linkable.
- **⚔️ Head to Head** (`/h2h`) — pick two participants and compare them
  match by match (duel record, wins/ties).
- **📊 Stats** (`/stats`) — the points race over the group stage: an animated
  timeline and the cumulative evolution chart.
- **📜 Rules** (`/rules`) — scoring tiers with examples, ranking rules, and how
  live matches are handled.

Reactions (emoji) sit on every leaderboard player and match card, backed by
Firebase with anonymous auth — no login needed. And when a tracked match's score
goes up while it's **live**, a full-screen **“Goooooal”** celebration waves
across the screen until you click it.

## How It Works

- **Predictions** — one CSV per participant in `src/data/predictions/`,
  exported from the pool's Google Sheet (per-person tab → File → Download →
  CSV). Drop a file in, rebuild, done. Predictions are frozen before kickoff.
- **Kickoff times** — the sheet records them in Brasília time (UTC-3); the UI
  converts each kickoff to the viewer's local timezone at render time.
- **What if…** — live match cards simulate one more goal for each side and
  show who gains, who drops, and how the ranking reshuffles.
- **Realtime data (Firebase RTDB)** — the single source of truth. The frontend
  reads three nodes via `onValue` (`src/lib/useGames.ts`, `useCommentary.ts`,
  `useReactions.ts`): `games`, `commentary`, and the reaction trees. Any write
  pushes to every open tab instantly. The public web config lives in
  `src/lib/firebase.ts`.
- **Scores poller** — a local cron runs `scripts/push-scores.mjs` every minute
  in the match window. It walks a source chain — **FIFA's public JSON API**
  (`api.fifa.com`, live scores) → ESPN scoreboard →
  [worldcup26.ir](https://github.com/rezarahiminia/worldcup2026) — and writes
  the first healthy result to the RTDB `games` node **only when something
  changed**. Beats GitHub cron's 5-minute floor and needs a Firebase service
  account (`firebase-admin`, bypasses the security rules).
- **🎙️ AI commentary** — on a finished match the same poller runs the shared
  engine in `scripts/commentary-core.mjs`: it computes the facts (exact hitters,
  lone-wolf picks, ranking swings) and asks Claude for a witty blurb plus the
  leaderboard recap and per-player titles, in en/pt/es, written to the RTDB
  `commentary` node. Only called when a match just finished — never on an
  unchanged tick. Needs `ANTHROPIC_API_KEY` in the poller's environment.
- **Slack digest** — the poller posts a finished-match digest (score, the
  English AI blurb, full standings, app link) to the pool's Slack channel via a
  Workflow Builder webhook. Gated by `SLACK_WEBHOOK_URL`, so it is a no-op when
  unset.
- **Analytics** — GA4 (`gtag`), fired from `src/lib/analytics.ts`: a
  `page_view` on every route change, plus `goal_celebration_shown` /
  `goal_celebration_click` for the goal overlay.

## Scoring

Highest matching tier wins, per match: **25** exact score · **18** correct
winner & winner's goals · **15** correct winner & goal difference · **12**
correct draw, wrong score · **10** correct winner only. Matches that have not
started are not scored; live matches score provisionally. Ties share a rank
(competition ranking).

## Deployment

`.github/workflows/deploy.yml` is the only workflow: on push to `master` it runs
the tests, builds, and publishes to GitHub Pages. Live data no longer flows
through CI — it comes from the local poller writing to Firebase.

## Configuration

The poller reads its config from the environment where the cron runs (not from
repository secrets):

| Setting | Where | Default |
| --- | --- | --- |
| Firebase service account | `GOOGLE_APPLICATION_CREDENTIALS` (poller env) | `~/.config/wc2026/serviceAccount.json` |
| Preferred score source | `SCORE_SOURCE` (poller env: `fifa`, `espn`, `worldcup26`) | `fifa` |
| worldcup26 base URL | `API_URL` (poller env) | `https://worldcup26.ir` |
| Claude API key (commentary) | `ANTHROPIC_API_KEY` (poller env) | — (no commentary when unset) |
| Commentary model | `COMMENTARY_MODEL` (poller env) | `claude-sonnet-4-6` |
| Slack webhook (match digest) | `SLACK_WEBHOOK_URL` (poller env) | — (no digest when unset) |

Firebase web config and the GA4 measurement ID are public and hardcoded
(`src/lib/firebase.ts`, `index.html`).

## Development

```bash
npm install
npm run dev      # dev server
npm test         # unit tests (scoring, ranking, parsers, sources)
npm run build    # production build
```

### Realtime / demo harness

Add `?demo` to the URL to point the whole app at an isolated `demo/` subtree of
the database — rehearse live pushes without touching real data:

```bash
node scripts/seed-demo.mjs                          # clone live nodes → demo/
node scripts/demo-score.mjs <matchId> <h> <a> live  # simulate a score/goal
```

Then open `http://localhost:5173/?demo` (e.g. `…/?demo#/bets/adriano`) and watch
the leaderboard, commentary, and the goal celebration update live.

### Poller

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/wc2026/serviceAccount.json \
  node scripts/push-scores.mjs   # fetch scores → RTDB (+ commentary/Slack with the keys set)
```
