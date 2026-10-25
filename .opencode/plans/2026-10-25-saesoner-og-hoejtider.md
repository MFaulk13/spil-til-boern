# Plan: Sæsoner og højtider

**Oprettet:** 25. oktober 2026
**Status:** Implementeret
**Spil:** Gotar

## Mål

Gotar skal skifte visuelt udtryk efter årstiden og de danske højtider. Temaet
vælges automatisk ud fra enhedens dato. Der er ingen vælger, ingen gemt
indstilling og ingen manuel override.

Det er et rent visuelt tema. Behov, priser, opgaver, belønninger, timere, HUD og
save-format er uændrede.

## Temaer

| Tema      | Periode                                           |
| --------- | ------------------------------------------------- |
| Forår     | 1. marts – 31. maj                                |
| Sommer    | 1. juni – 31. august                              |
| Efterår   | 1. september – 30. november                       |
| Vinter    | 1. december – sidste dag i februar                |
| Halloween | 24. oktober – 1. november                         |
| Jul       | 1. – 25. december                                 |
| Nytår     | 30. december – 2. januar                          |
| Påske     | palmesøndag til og med 2. påskedag                |
| Fastelavn | lørdag før fastelavnssøndag til fastelavnstirsdag |
| Sankthans | 22. – 24. juni                                    |

Højtid vinder over sæson. Prioritering ved overlap:
fastelavn → påske → halloween → jul → nytår → sankthans.

Påskedatoen beregnes med den gregorianske algoritme. Ugyldig dato giver vinter.

## Implementering

- `src/game/catalog/seasons.ts` indeholder tema-id’er, labels, farver,
  partikeltyper og asset-nøgler.
- `src/systems/season.ts` indeholder rene dato-funktioner:
  `seasonForDate`, `holidayForDate`, `easterSunday`, `fastelavnWindow`,
  `easterWindow`, `seasonThemeForDate` og `currentSeasonTheme`.
- `src/game/text.ts` har `text.seasons`.
- `src/ui/SeasonDecor.ts` tilføjer farvevask, pynt, temamarkering og rolige
  partikler. Partikler slås fra ved reduceret bevægelse og begrænses i
  low-memory.
- `src/ui/background.ts` bruger temaets gradient i menuer og andre
  baggrundsscener.
- Temaet anvendes i menu, profiler, karakter, ægvalg, udklækning, hjem, by,
  butik, park, skole og quiz.
- Hjemmets sæsonlag ligger uden for rummets egne objekter og genskabes ikke ved
  rumskift.

## Assets

Ti nye SVG’er i `src/assets/seasons/` med 256×256, transparent baggrund og
færdige farver. De er registreret i `ASSET_MANIFEST` som `decor` og har lavere
rasterstørrelse i low-memory.

## Tests

- `tests/season.test.ts` dækker sæsongrænser, skudår, påske, fastelavn,
  halloween, jul, nytår, sankthans, prioritet og ugyldig dato.
- `tests/catalog.test.ts` kræver, at alle temaer har gyldige data og assets.
- `npm run lint`, `npm run typecheck`, `npm run test` og `npm run build`.

## Uden for planen

- Manuel temavælger eller gemt temaindstilling.
- Sæsonbestemte butiksvarer, opgaver, mærker eller belønninger.
- Tidsbegrænset indhold.
- Nye lyde eller ændringer i HUD.
