# Plan: Børnespil i browseren

**Oprettet:** 21. oktober 2026
**Status:** Fase 1 i gang
**Arbejdstitel:** spil (midlertidigt)

## Formål

Et spil til børn i 3. klasse, der kan åbnes direkte i en browser via et link – uden
download eller installation. Spillet skal primært virke på tablet og desktop i
landskabsformat, med touch og mus som input.

Spil-idéen er endnu ikke fastlagt. Fase 1 handler derfor om at bygge et solidt,
spilagnostisk fundament, som mekanikkerne kan bygges oven på i fase 2.

## Beslutninger

| Emne            | Valg                       | Begrundelse                                                                |
| --------------- | -------------------------- | -------------------------------------------------------------------------- |
| Motor           | Phaser 3.90                | Moden 2D-motor med scenes, input, lyd og skalering. Stort eksempelkatalog. |
| Build           | Vite 8                     | Hurtig dev-server, statisk build der kan hostes gratis.                    |
| Sprog           | TypeScript 5.9 (strict)    | Færre fejl, bedre autocomplete, lettere at udvide.                         |
| Hosting         | GitHub Pages               | Gratis, offentligt repo, automatisk deploy via GitHub Actions.             |
| Enheder         | Tablet + desktop, landskab | Touch og mus. Skaleres med `Scale.FIT`.                                    |
| Sprog i spillet | Dansk                      | Kode og kommentarer på engelsk.                                            |
| Tests           | Vitest                     | Unit tests af ren logik (gem, matematik).                                  |

## Fase 1 – Fundament (denne session)

### Projekt og værktøj

- [x] Git-repo initialiseres lokalt (remote oprettes af brugeren senere).
- [x] `package.json` med scripts: `dev`, `build`, `preview`, `typecheck`, `lint`,
      `format`, `test`.
- [x] Vite-konfiguration med `base` fra `VITE_BASE` (til GitHub Pages),
      alias `@` → `src`, og `server.host` så spillet kan testes fra tablet.
- [x] TypeScript strict, ESLint flat config, Prettier, Vitest.

### Spil-skeleton

- [x] `src/game/config.ts`: 1280×720 base-opløsning, `Scale.FIT`,
      `CENTER_BOTH`, scene-liste.
- [x] Scenes: `Boot` → `Preload` → `Menu` → `Game` + `UI`-overlay.
- [x] Placeholder-grafik som SVG (figur, stjerne).
- [x] Demo-mekanik: figur flyttes med touch/mus/piletaster, stjerner samles,
      mål nås, og spillet kan startes forfra. Beviser hele pipelinen.

### Systemer

- [x] `AudioManager`: syntetiserede placeholder-lyde, mute, unlock ved første
      brugerinteraktion (kræves på tablets).
- [x] `SaveManager`: versioneret localStorage-gem med indstillinger, samlede
      stjerner og highscore. Falder tilbage til hukommelse, hvis storage er
      utilgængeligt.
- [x] Store touch-venlige knapper (min. 64 px) og tydelig dansk tekst.
- [x] Dansk tekst samlet ét sted (`src/game/text.ts`).

### Kvalitet og drift

- [x] Unit tests for `SaveManager` og matematik-helpers.
- [x] README med kørsel, test og deploy.
- [x] GitHub Actions-workflow til GitHub Pages.

### Verificering

- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` er grønne.
- [x] Manuel test i browser ved forskellige vinduesstørrelser.

## Fase 2 – Spillet (næste session)

Brugeren giver detaljerne. Forventet input:

- Tema og handling.
- Mekanik: hvordan styrer man, hvad er målet, hvordan vinder/taber man.
- Om der skal levels, tid, point eller samarbejde.
- Ønsker til figurer, farver og lyde.

Vi genbruger scenes og systemer og tilføjer:

- [ ] Rigtig spilmekanik og niveauer.
- [ ] Endelig grafik og lyd (erstat placeholders).
- [ ] Balancering for 3. klasse (læsbar tekst, tydelige mål, korte runder).
- [ ] Evt. lokal highscore og "spil igen"-flow.

## Fase 3 – Polering

- [ ] Test på fysisk tablet og telefon.
- [ ] Ydeevne og batteri (begræns partikler, pause når fanen er skjult).
- [ ] Tilgængelighed: kontrast, knapstørrelser, ingen tekst-only instruktioner.
- [ ] Evt. PWA/offline og "føj til hjemmeskærm".
- [ ] Evt. flere sprog.

## Teknisk struktur

```text
spil/
  .github/workflows/deploy.yml
  .opencode/plans/
  public/
  src/
    assets/images/       # SVG-placeholders
    game/                # config, konstanter, dansk tekst
    scenes/              # Boot, Preload, Menu, Game, UI
    systems/             # audio, save
    ui/                  # knapper og tema
    utils/               # rene helpers
    main.ts
  tests/
  AGENTS.md
  index.html
  vite.config.ts
```

## Risici og noter

- **Phaser 4** er nyeste version, men økosystemet og eksemplerne er stadig
  primært Phaser 3. Vi holder os til 3.90 og kan opgradere senere.
- **Lyd på iOS/Android** kræver et bruger-tryk før `AudioContext` må starte.
  Derfor unlockes lyden ved første pointer/keydown.
- **GitHub Pages kræver offentligt repo** (eller Pro). Brugeren opretter remote
  og slår Pages til med "GitHub Actions" som source.
- **Assets**: Placeholder-grafik er enkel SVG. Endelig grafik skal have en
  børnevenlig, tydelig stil og gerne rundede former.
