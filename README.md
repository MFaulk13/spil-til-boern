# Gotar

Gotar er et browserbaseret pasningsspil til børn i 3. klasse. Man laver sin
figur, vælger et æg, udklækker sit kæledyr og passer det. Spillet kan åbnes via
et link uden download eller installation og virker på tablet og desktop i
landskabsformat.

Projektet er bygget med [Phaser 3](https://phaser.io/), Vite og TypeScript.

## Kom i gang

```bash
npm install
npm run dev
```

Åbn <http://localhost:5173>. Dev-serveren lytter også på netværket, så du kan
åbne spillet fra en tablet på samme Wi-Fi. Kør `ipconfig` for at finde
computerens IPv4-adresse og åbn `http://<ip>:5173` på tabletten.

## Scripts

| Kommando             | Beskrivelse                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Dev-server med hot reload                |
| `npm run build`      | Typecheck + produktionsbuild til `dist/` |
| `npm run preview`    | Servér produktionsbuild lokalt           |
| `npm run typecheck`  | TypeScript uden emit                     |
| `npm run lint`       | ESLint                                   |
| `npm run format`     | Prettier                                 |
| `npm run test`       | Vitest (én kørsel)                       |
| `npm run test:watch` | Vitest i watch-mode                      |

## Struktur

```text
src/
  assets/
    character/       # lagdelte SVG'er til figuren
    eggs/            # æg og mønstre
    pets/            # de 9 kæledyr
    rooms/           # baggrunde
    ui/              # ikoner
  game/
    catalog/         # data: udseende, kæledyr og genstande
    assets.ts        # asset-manifest til Preload
    config.ts        # Phaser-config og sceneliste
    constants.ts
    text.ts          # alle danske spiltekster
    types.ts
  scenes/            # Boot, Preload, Menu, Character, PetSelect, Hatch, Home
  systems/           # lyd, gem og spil-logik
  ui/                # knapper, karaktervisning, kæledyrsvisning, tema
  utils/             # rene hjælpefunktioner
tests/               # unit tests
```

Danske spiltekster ligger i `src/game/text.ts`. Al anden kode er på engelsk.

## Sådan udvider du spillet

- **Ny scene:** opret klassen i `src/scenes/`, og tilføj den til scene-listen i
  `src/game/config.ts`.
- **Nye billeder:** læg SVG-filen i `src/assets/`, tilføj den til
  `src/game/assets.ts`, og brug nøglen i kataloget eller scenen.
- **Nyt kæledyr:** tilføj det i `src/game/catalog/pets.ts`, `src/game/text.ts`
  og asset-manifestet.
- **Ny lyd:** lydeffekter og baggrundsmusik genereres med Web Audio i
  `src/systems/audio.ts`.
- **Fremgang og indstillinger:** brug `save` fra `src/systems/save.ts` – skriv
  ikke direkte til `localStorage`.

## Deploy til GitHub Pages

1. Opret et offentligt GitHub-repo, og tilføj det som remote.
2. Push til `main`.
3. Gå til **Settings → Pages**, og vælg **GitHub Actions** som source.
4. Workflowen `.github/workflows/deploy.yml` kører test og build og deployer
   `dist/` ved hvert push til `main`.

Workflowen sætter `VITE_BASE` til `/<repo-navn>/`, så assets virker under
GitHub Pages' undermappe. Kører du build lokalt, bruges `/` som base.

## Næste skridt

Fase 2A er en vertikal slice: figur → æg → udklækning → hjem. Herefter følger
behov, plejehandlinger, indretning og byen. Se
`.opencode/plans/2026-10-22-gotar-fase-2.md` for den fulde plan.
