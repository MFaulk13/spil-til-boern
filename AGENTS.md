# AGENTS.md

## Projekt

Browserbaseret børnespil til 3. klasse. Bygget med Phaser 3, Vite og TypeScript.
Spillet ligger på GitHub Pages og skal kunne åbnes via et link uden installation.
Primære enheder: tablet og desktop i landskabsformat (touch + mus).

Arbejdstitlen er "spil", indtil spil-idéen er fastlagt. Se
`.opencode/plans/2026-10-21-borns-spil.md` for planen.

## Kommandoer

```bash
npm install          # Installer afhængigheder
npm run dev          # Dev-server på http://localhost:5173 (også på LAN)
npm run build        # Typecheck + produktionsbuild til dist/
npm run preview      # Servér produktionsbuild lokalt
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier (skriv)
npm run test         # Vitest (kør én gang)
```

Kør altid `npm run lint`, `npm run typecheck` og `npm run test` efter større
ændringer. Kør `npm run build`, før du melder en opgave som færdig.

## Konventioner

- **Kode på engelsk**, spiltekster på dansk. Alle danske tekster samles i
  `src/game/text.ts` – hardcode dem ikke i scenes.
- TypeScript strict. Ingen `any`; brug præcise typer eller `unknown`.
- Ingen kommentarer medmindre de forklarer en ikke-oplagt beslutning.
- Brug sti-aliaset `@/` for imports fra `src/`.
- Phaser-scenes ligger i `src/scenes/`, én klasse pr. fil, og registreres i
  `src/game/config.ts`.
- Genbrugelige UI-elementer (knapper, paneler) hører i `src/ui/`.
- Spiltilstand og indstillinger gemmes via `src/systems/save.ts`. Læs/skriv ikke
  direkte til `localStorage` fra scenes.
- Lyd afspilles via `src/systems/audio.ts`, så mute og unlock håndteres ét sted.
- Rene hjælpefunktioner i `src/utils/` og dækkes med unit tests i `tests/`.

## Designkrav til børn

- Store trykflader: minimum 64 px i spillets koordinater.
- Tydelig, stor tekst og høj kontrast.
- Instruktioner må ikke være tekst-only; brug ikoner, farver og lyd.
- Undgå timere og "game over"-stress, medmindre spil-idéen kræver det.
- Spillet skal fungere uden hover (touch) og uden præcisionskrævende input.
- Alt skal kunne køre i landskab på en tablet, også uden tastatur.

## Teknisk

- Base-opløsning er 1280×720; `Scale.FIT` + `CENTER_BOTH` håndterer skalering.
- Assets importeres gennem Vite (`import url from '@/assets/...'`), så hashing og
  `base` virker på GitHub Pages. Undgå absolutte stier i koden.
- Deploy sker automatisk fra `main` via `.github/workflows/deploy.yml`, som
  sætter `VITE_BASE` til `/repo-navn/`.
- Nye npm-afhængigheder: verificér at de er nødvendige, og hold dem opdaterede.
- Commits, push og PRs kun når brugeren beder om det.
