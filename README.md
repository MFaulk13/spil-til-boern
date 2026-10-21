# spil

Et browserbaseret spil til børn i 3. klasse. Spillet kan åbnes via et link uden
download eller installation og virker på tablet og desktop i landskabsformat.

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
  assets/images/   # grafik (foreløbigt SVG-placeholders)
  game/            # Phaser-config, konstanter og danske tekster
  scenes/          # Boot, Preload, Menu, Game og UI
  systems/         # lyd og gem
  ui/              # knapper og farvetema
  utils/           # rene hjælpefunktioner
tests/             # unit tests
```

Danske spiltekster ligger i `src/game/text.ts`. Al anden kode er på engelsk.

## Sådan udvider du spillet

- **Ny scene:** opret klassen i `src/scenes/`, og tilføj den til scene-listen i
  `src/game/config.ts`.
- **Nye billeder:** læg dem i `src/assets/images/`, importér URL'en i
  `PreloadScene`, og kald `this.load.image('<navn>', url)`.
- **Ny lyd:** læg filer i `src/assets/audio/` og indlæs dem i `PreloadScene`.
  Indtil videre genereres lydeffekter med Web Audio i `src/systems/audio.ts`.
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

Spilmekanikkerne er endnu ikke bygget. Demo-scenen viser en figur, der kan
flyttes med fingeren eller piletasterne, og som samler stjerner. Se
`.opencode/plans/2026-10-21-borns-spil.md` for planen.
