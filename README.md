# AC World Cup 2026 BET

Leaderboard for the Analytics Cloud World Cup 2026 betting pool. Static site
(GitHub Pages): predictions are CSVs bundled at build time; live scores arrive
via a scheduled GitHub Action that commits `public/games.json`.

## How It Works

- **Predictions** — one CSV per participant in `src/data/predictions/`,
  exported from the pool's Google Sheet (per-person tab → File → Download →
  CSV). Drop a file in, rebuild, done. Predictions are frozen before kickoff.
- **Scores** — `.github/workflows/update-scores.yml` runs hourly, fetches the
  [worldcup26.ir](https://github.com/rezarahiminia/worldcup2026) API
  server-side (it has no CORS), normalizes it into `public/games.json`, and
  commits when something changed; that triggers a Pages deploy. A left-open tab
  also re-fetches `games.json` every `VITE_REFRESH_INTERVAL_MS`.

## Scoring

Highest matching tier wins, per match: **25** exact score · **18** correct
winner & winner's goals · **15** correct winner & goal difference · **12**
correct draw, wrong score · **10** correct winner only. Matches that have not
started are not scored; live matches score provisionally. Ties share a rank
(competition ranking).

## Configuration

| Setting | Where | Default |
| --- | --- | --- |
| Score refresh cadence | `cron` in `update-scores.yml` | hourly |
| Score source | `API_URL` repository variable | `https://worldcup26.ir` |
| Client re-fetch interval | `VITE_REFRESH_INTERVAL_MS` (build-time) | `3600000` |
| Games file URL | `VITE_GAMES_URL` (build-time) | `<base>/games.json` |

## Development

```bash
npm install
npm run dev            # dev server
npm test               # unit tests (scoring, ranking, parsers)
npm run build          # production build
npm run update-scores  # refresh public/games.json from the API
```
