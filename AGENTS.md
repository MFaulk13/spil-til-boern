# AGENTS.md

## Projekt

Gotar er et browserbaseret pasningsspil til 3. klasse, bygget med Phaser 3, Vite
og TypeScript. Det kører på GitHub Pages og skal virke på tablet og desktop i
landskabsformat med touch og keyboard. Planer og beslutninger ligger i
`.opencode/plans/` – læs den nyeste relevante plan, før du udvider et system.

## Kommandoer

```bash
npm install
npm run dev          # http://localhost:5173, også på LAN
npm run build        # tsc --noEmit + vite build til dist/
npm run typecheck
npm run lint
npm run test         # vitest run
npm run test -- tests/quiz.test.ts   # enkelt testfil
npm run format       # Prettier
```

Node >=22.12. Efter ændringer: `npm run lint`, `npm run typecheck` og
`npm run test`. Kør `npm run build`, før du melder en opgave som færdig. CI kører
samme rækkefølge og deployer `main` til GitHub Pages med `VITE_BASE=/<repo>/`.

## Arkitektur og faldgruber

- Nye scenes i `src/scenes/` skal registreres både i `SCENE_KEYS`
  (`src/game/constants.ts`) og scene-listen (`src/game/config.ts`). Skift scene
  via `SCENE_KEYS`, ikke string-literals.
- `HomeScene` er hubben og starter `HudScene` som overlay. HUD og hjemmet taler
  sammen via `gameEvents` (`src/systems/events.ts`) – brug ikke direkte
  scene-referencer. Stop HUD, når du forlader hjemmet.
- Spildata er katalogdrevet: udseende, kæledyr, genstande, rum, talenter og quiz
  ligger i `src/game/catalog/`. Udvid kataloget frem for at hardcode i scenes;
  `tests/catalog.test.ts` kræver gyldige id'er, priser og assets.
- Assets: læg SVG'en i `src/assets/`, importér URL'en i `src/game/assets.ts`, og
  tilføj en manifest-post med dimensioner. Store scene-baggrunde i
  `LAZY_SCENE_ASSET_KEYS` loades i scenens `preload` via `loadMissingAssets`; alt
  andet loades i `PreloadScene`. Brug ikke absolutte eller `public/`-stier.
- Danske tekster ligger i `text` (`src/game/text.ts`); quizbanker ligger i
  `src/game/text/banks/*.ts`. Importstien `@/game/text` er stabil – hardcode ikke
  dansk tekst i scenes.
- Gem via singleton `save` (`src/systems/save.ts`); sættere gemmer automatisk.
  Den håndterer op til 6 profiler, indstillinger og migrering af ældre saves.
  Skriv ikke til `localStorage`; læg migrering i `parseSave`, og brug
  `new SaveManager(createMemoryStorage())` i tests.
- Lyd er genereret Web Audio i `src/systems/audio.ts`, tale går via
  `src/systems/speech.ts` (`da-DK`/`en-US`), og bevægelser styres med
  `isReducedMotion()`. Tilføj lyde som `SfxName` i stedet for lydfiler.
- TypeScript er strict med `verbatimModuleSyntax` og `noUnused*`: brug
  `import type` til typer, og undgå ubrugte parametre (eller præfiks med `_`).

## Konventioner

- Kode og id'er på engelsk; alle spiltekster på dansk.
- Brug sti-aliaset `@/` for imports fra `src/` (virker også i tests).
- Ingen `any`; brug præcise typer eller `unknown`.
- Ingen kommentarer medmindre de forklarer en ikke-oplagt beslutning.
- Scenes: én klasse pr. fil. Genbrugelige UI-elementer i `src/ui/`, rene
  hjælpefunktioner i `src/utils/` med tests i `tests/`.

## Designkrav til børn

- 1280×720 landskab med `Scale.FIT` + `CENTER_BOTH`; skal virke på tablet og
  desktop.
- Trykflader mindst 64 px (`MIN_TOUCH_TARGET`); ingen hover-only eller
  præcisionskrævende input. Tastatur er et supplement, ikke et krav.
- Stor, tydelig tekst og høj kontrast. Instruktioner skal have ikon, farve eller
  lyd – ikke kun tekst.
- Undgå timere og "game over"-stress, og respektér reduceret bevægelse.

## Git

- Commit, push og PR kun når brugeren beder om det.
