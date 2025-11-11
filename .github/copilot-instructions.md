## Context — big picture

- Frontend-only repository: a Vite + React + TypeScript single-page app (shadcn-ui + Tailwind). Entry is `src/main.tsx` -> `src/App.tsx` (routing).
- Realtime backend is Supabase (client at `src/integrations/supabase/client.ts`). The app treats Supabase as the authoritative source of truth for game state (tables: `game_rooms`, `players`, `game_rounds`, `player_answers`, `player_votes`, `round_readiness`).
- Business/domain logic lives in `src/services/*` (notably `gameService.ts` and `gameRoundService.ts`) and type/utility helpers in `src/lib/gameState.ts` (GameLogic, types, mock helpers).

## Primary flows you should know (where to look / why)

- Create / join flow: `src/pages/JoinGame.tsx` -> uses `GameService.joinGame` and then navigates to `WaitingRoom`.
- Start / round lifecycle: host starts in `src/pages/WaitingRoom.tsx` which calls `GameService.startGame` and dynamically imports `GameRoundService.createRound` to initialize rounds.
- Round runtime: `src/pages/GameRound.tsx` uses `useGameRound` and `useGameRoom` hooks to subscribe to live data and render phases (answer-submission, voting, results).
- Real-time updates: look for `supabase.channel(...).on('postgres_changes', { ... filter: 'room_id=eq.${roomId}' }, ...)` inside `src/hooks/useGameRound.ts` and `src/pages/*`. Use the same pattern for adding subscriptions.

## Key files to reference (quick guide)

- Routing and providers: `src/App.tsx` (React Query, AuthProvider, Router)
- Supabase client (public key + URL): `src/integrations/supabase/client.ts` — the app uses a generated client and public keys are present here.
- Domain & types: `src/lib/gameState.ts` (Question, QuestionPack, GameRoom, GameLogic utilities)
- Server-like operations (DB writes + validation): `src/services/gameService.ts` (create/join/start/advance/kick) and `src/services/gameRoundService.ts` (create round, submit answers/votes, compute scores, readiness checks)
- Hooks that encapsulate real-time local state: `src/hooks/useGameRound.ts` and `src/hooks/useGameRoom.ts` (subscribe/unsubscribe patterns)
- UI entry points illustrating patterns: `src/pages/WaitingRoom.tsx`, `src/pages/GameRound.tsx`, `src/pages/JoinGame.tsx` and game components in `src/components/game/`.

## Project-specific conventions & patterns

- Path alias `@/` is used across imports; mirror tsconfig paths when adding files.
- Supabase is treated as the backend: prefer calling `GameService` / `GameRoundService` for any DB mutation rather than writing ad-hoc `supabase.from(...).insert(...)` in pages or components.
- Host validation is enforced in service methods (e.g., `GameService.startGame` and `advanceToNextQuestion` check the caller is the host). Keep that pattern when adding privileged actions.
- Real-time channels use Postgres `postgres_changes` events and explicit table filters. When subscribing, ensure you unsubscribe on cleanup: use `supabase.removeChannel(channel)`.
- For completion/race-safety the app double-checks DB state before advancing phases (see `GameRoundService.checkAllAnswersSubmitted` usage). Follow this pattern where race conditions matter.
- Question packs and i18n: question data lives under `src/data/` (e.g., `popCulture.json`, `popCultureEs.json`); language selection is stored on the `game_rooms` row and used to pick packs.

## Running & developer workflows (concrete)

- Install and run dev server (recommended):

  npm install
  npm run dev

- Build / preview:

  npm run build
  npm run preview

- Lint:

  npm run lint

- Notes: `bun.lockb` exists but primary scripts assume Node/npm. The `README.md` references Lovable tooling — for local dev use the npm scripts above.

## How to add changes safely (practical rules for an AI agent)

1. Respect service boundaries: prefer changing/adding logic in `src/services/*` and `src/lib/*` for domain rules rather than embedding SQL or complex logic in components.
2. Keep real-time subscription code consolidated in hooks (`src/hooks/*`). If you add a new subscription, follow the pattern: create channel, `.on('postgres_changes', { table, filter }, handler)`, and remove it on cleanup.
3. When modifying game flow/phases: update both DB-updating service methods and client-side checks (hooks/pages that advance phases) — the app assumes the DB is the source of truth.
4. When adding new DB columns/tables: search for all services referencing the related tables (use grep for `from('players')` or `from('game_rounds')`) and update the typed interfaces in `src/services/*` and `src/lib/gameState.ts`.

## Quick examples (search & pattern snippets)

- To find where a round is created: search for `createRound(` (example: `src/services/gameRoundService.ts` and dynamic import in `src/pages/WaitingRoom.tsx`).
- To find real-time subscriptions: search for `postgres_changes` or `supabase.channel(` — many hooks/pages follow the same subscribe/unsubscribe pattern.
- To see scoring logic: open `src/services/gameRoundService.ts::calculateRoundScores` and `src/lib/gameState.ts::GameLogic.calculateScores` for server- and client-side scoring examples.

## Safety & secrets

- The repo currently contains a public Supabase URL and a publishable key in `src/integrations/supabase/client.ts` (used client-side). Do NOT add server-secret keys to the frontend. For server-side logic consider Supabase Functions (there is a `supabase/functions/` directory) or a private server.

## What an AI agent should not do

- Do not assume direct access to any private server environment. Avoid hardcoding secret keys. Prefer to change `src/services/*` to add validation rather than inlining privileged checks in UI components.

---

If you want, I can: (1) add short examples/show a small patch that centralizes a subscription pattern into a reusable helper, or (2) expand this file with a small “onboarding checklist” for new contributors. Anything unclear or missing you want added? 
