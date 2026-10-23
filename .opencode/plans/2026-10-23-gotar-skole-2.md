# Plan: Gotar – skole 2.0

**Oprettet:** 23. oktober 2026
**Status:** Implementeret
**Spil:** Gotar

## Beslutninger

- Skolen udvides fra 4 til 8 fag.
- Nye fag: historie, kristendom, musik og idræt/sundhed.
- Ca. 30 faste spørgsmål pr. fag; matematik genereres fortsat.
- Skjult adaptiv sværhedsgrad i tre niveauer.
- Kun stjerner som belønning – ingen medaljer eller diplom.
- Kæledyrs-talenter låses op, når et fag er gennemført første gang.
- Spørgsmålsbanker deles op i `src/game/text/banks/`; importstien
  `@/game/text` bevares.

## Fag

| Fag           | Id         | Ikon            | Indhold                                                          |
| ------------- | ---------- | --------------- | ---------------------------------------------------------------- |
| Matematik     | `math`     | `icon-math`     | 12 genererede opgavetyper og 3 niveauer                          |
| Dansk         | `danish`   | `icon-danish`   | Læsning, stavning, rim, ordklasser, modsætninger, en/et, flertal |
| Engelsk       | `english`  | `icon-english`  | Ord, tal, farver, krop, familie, mad og enkle fraser             |
| Natur         | `nature`   | `icon-nature`   | Dyr, planter, vejr, krop, materialer, magnetisme og genbrug      |
| Historie      | `history`  | `icon-history`  | Vikinger, middelalder, opfindelser, før/nu og tidslinje          |
| Kristendom    | `religion` | `icon-religion` | Bibelfortællinger, højtider, kirke, symboler og næstekærlighed   |
| Musik         | `music`    | `icon-music`    | Høj/lav, rytme, instrumenter, toner og sang                      |
| Idræt/sundhed | `sport`    | `icon-sport`    | Krop, motion, søvn, mad, hygiejne, regler og samarbejde          |

## Quiz-motor

- `QuizDifficulty = 1 | 2 | 3`.
- Startniveau 1, eller 2 hvis faget har mindst 2 stjerner.
- To rigtige på første forsøg hæver niveauet; et forkert svar sænker det.
- Niveauet vises ikke for barnet.
- Spørgsmål i en runde må ikke gentages. Ved tom pulje falder udvælgelsen
  tilbage til nærmeste niveau.
- `QuizQuestion` får `difficulty`, `speechLang` og eventuelt `audio`.
- Engelsk læses op med engelsk stemme.
- Musik kan afspille korte tonemønstre via `AudioManager.playNotes`.
- Lydspørgsmål filtreres fra, når lyden er slået fra.
- Svarknapper får tekstombrydning og mindre skrift ved lange svar.
- Ur, mønter, brøk, figur og tallinje tegnes i `QuizVisualView`.

## Matematik

Eksisterende typer: plus, minus, tabeller, division, talrækker,
hverdagsopgaver, ur og mønter.

Nye typer: brøker, figurer, tallinje og afrunding.

Alle typer skalerer tal og indhold efter sværhedsgrad.

## Skole-skærmen

- 8 kort i 4×2-layout, ca. 280×196 px.
- Hvert kort viser ikon, fag, kort beskrivelse, stjerner, runder og træfsikkerhed.
- Hele kortet er trykflade med en tydelig “Spil”-pille.
- Tastaturgenveje 1–8.
- Fagfarver samles i `theme.ts`.
- Header med “Til byen”, titel, undertitel og hjerter bevares.

## Kæledyrs-talenter

- Et talent låses op, når faget har `firstCompleted = true`.
- Talenterne er fælles for alle kæledyr.
- `PetPanel` får fanerne “Dyr” og “Kunster”.
- Låste kunster viser, hvilket fag der mangler.
- Et tryk lukker panelet og afspiller animationen i hjemmet.
- Tastaturgenvej `L` åbner “Kunster”.

| Fag        | Talent      | Animation                  |
| ---------- | ----------- | -------------------------- |
| Matematik  | Tæl til tre | Tre talbobler              |
| Dansk      | Læs et ord  | Ord-boble og nik           |
| Engelsk    | Sig “hello” | Boble og engelsk oplæsning |
| Natur      | Snus        | Snuser og finder et hjerte |
| Historie   | Ridderbuk   | Bukker som en ridder       |
| Kristendom | Fold poter  | Sidder stille og folder    |
| Musik      | Syng        | Toner og nodebobler        |
| Idræt      | Hop         | Hop eller lille trick      |

Talenter giver +5 glæde, ikke hjerter, og har en kort cooldown.

## Filer

**Nye:**

- `src/game/catalog/talents.ts`
- `src/systems/quiz.ts`
- `src/systems/talents.ts`
- `src/ui/QuizVisualView.ts`
- `src/game/text/banks/*.ts`
- `src/assets/ui/icon-history.svg`
- `src/assets/ui/icon-religion.svg`
- `src/assets/ui/icon-music.svg`
- `src/assets/ui/icon-sport.svg`
- `tests/talents.test.ts`

**Ændrede:**

- `src/game/types.ts`
- `src/game/catalog/quiz.ts`
- `src/game/assets.ts`
- `src/game/text.ts`
- `src/ui/theme.ts`
- `src/scenes/SchoolScene.ts`
- `src/scenes/QuizScene.ts`
- `src/scenes/HomeScene.ts`
- `src/ui/PetPanel.ts`
- `src/ui/PetView.ts`
- `src/systems/speech.ts`
- `src/systems/audio.ts`
- `tests/quiz.test.ts`
- `tests/catalog.test.ts`
- `tests/save.test.ts`
- `AGENTS.md`

Save-formatet ændres ikke. Gamle saves med fire fag indlæses som før, og de
nye fag starter tomme.

## Test

- Alle otte fag har info, ikon og tekst.
- Hver fast bank har mindst 30 spørgsmål og mindst 10 pr. niveau.
- Unikke svarmuligheder, gyldigt svar og ingen dubletter i prompts.
- Engelsk har engelsk oplæsning; musik har både lyd- og tekstspørgsmål.
- Matematik virker for alle typer og niveauer; division er præcis, og svar er
  ikke negative.
- Ingen gentagelser i en runde på fem spørgsmål.
- Adaptiv sværhedsgrad hæver/sænker korrekt og clamps til 1–3.
- Præcis ét talent pr. fag, og det låses kun op ved `firstCompleted`.
- Gamle saves uden de nye fag indlæses korrekt.
- `lint`, `typecheck`, `test` og `build` kører grønt.

## Uden for planen

Medaljer, diplom, fejlgennemgang, flere gemte profiler, separat lydstyrke,
flere parkaktiviteter og præstationsbog er udskudt til en senere fase.

## Verifikation

- [x] Nye fag og ikoner registreret.
- [x] Spørgsmålsbanker og adaptiv motor implementeret.
- [x] Skole- og quiz-scene opdateret.
- [x] Kæledyrs-talenter implementeret.
- [x] Tests og build grønne for skoleændringerne.
- [ ] Manuel kontrol i browser.
