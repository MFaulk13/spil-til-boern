# Plan: Garderobe med progression

**Oprettet:** 23. oktober 2026
**Status:** Implementeret

## Mål

Gør den første karakteropsætning overskuelig og skab et tydeligt incitament til at
tjene hjerter og købe nyt tøj. I dag er ca. 90 udseendevalg gratis fra første
sekund, og butikken sælger intet tøj.

## Beslutninger

- Nyt tøj købes i butikkens nye **Tøj**-fane.
- Identitet er gratis: køn, hud, alle øjne og alle munde.
- Hår, tøj, farver og tilbehør får en lille gratis startpakke.
- Låste ting skjules i den første karakter-skaber og vises først med lås + pris i
  skabet.
- Eksisterende spil beholder deres nuværende look, som samtidig låses op som
  ejet.
- Køb tages på med det samme, så barnet ser resultatet. Tøjet kan derefter
  skiftes i skabet.

## Startgarderobe

| Fane     | Gratis fra start              | Låst fra start        |
| -------- | ----------------------------- | --------------------- |
| Køn      | 2                             | 0                     |
| Hud      | 6                             | 0                     |
| Hår      | 3 frisurer + 4 farver         | 8 frisurer + 6 farver |
| Øjne     | 3 i skaberen, alle 9 i skabet | 0                     |
| Mund     | 3 i skaberen, alle 9 i skabet | 0                     |
| Tøj      | 3 outfits + 4 farver          | 14 outfits + 6 farver |
| Tilbehør | Ingen + briller + kasket      | 13                    |

Første karakter-skaber går fra ca. 90 valg til ca. 31 valg fordelt på de samme 7
faner.

## Butikken

- Ny **Tøj**-fane med 47 købbare ting.
- Priser: farver 6 hjerter, frisurer 10-16, outfits 12-22, tilbehør 10-20.
- Farvevarer vises som farvecirkler i stedet for billeder.
- Ejet tøj kan ikke købes igen og vises med badge.
- Den nuværende "Tilbehør"-fane for kæledyr omdøbes til **Dyrepynt**.
- Butikken kan åbnes fra skabet og gå tilbage dertil med "Til skabet".

## Skabet

- Første gang: kun startpakken vises.
- I skabet: alle valg vises. Låste felter er dæmpede med hængelås og pris.
- Tryk på en låst ting åbner butikkens Tøj-fane på den relevante side.
- Ny **Butik**-knap i skabet.
- "Tilfældig" vælger kun ting, barnet ejer.

## Teknisk

- `src/game/types.ts`: `wardrobe` i `ITEM_CATEGORIES`, `WardrobeSlot` og valgfrie
  wardrobe-felter på `ItemDefinition`.
- `src/game/catalog/wardrobe.ts`: id-mapping og quick-start-lister.
- `src/game/catalog/items.ts`: genererede wardrobe-items ud fra
  appearance-kataloget med id'er som `hair-braid`, `hair-color-blue`,
  `outfit-princess`, `outfit-color-pink`, `accessory-crown`.
- `src/systems/wardrobe.ts`: ejerskab, låsning, påklædning og migrering af
  nuværende look.
- `src/systems/save.ts`: `ownsWardrobeItem()` og `buyWardrobeItem()`.
  Eksisterende `purchases` genbruges som ejerskab, og nuværende equipped tøj
  seedes ind ved indlæsning. Ingen ny save-version nødvendig.
- `src/systems/appearance.ts`: `randomizeLook()` får en valgfri pulje.
- `src/scenes/CharacterScene.ts`: filtrering ved første opsætning, låste felter,
  priser, Butik-knap og shop-navigation.
- `src/scenes/ShopScene.ts`: 6 dynamiske faner, Tøj-grid, køb/påklædning,
  `origin: 'wardrobe'` og fokus-side.
- `src/ui/ItemCard.ts`: understøttelse af farvecirkler.
- `src/ui/theme.ts`: farve til wardrobe-kategorien.
- `src/game/text.ts`: nye danske tekster.
- `src/scenes/HudScene.ts`: knappen "Skab" omdøbes til "Tøj".

## Migrering

- Eksisterende look bevares.
- Betalte ting i det nuværende look registreres som ejet.
- Gratis/start-ting kræver ingen registrering.
- Intet nuværende tøj fjernes fra en eksisterende figur.

## Test og verifikation

- Katalogtest: alle wardrobe-items peger på gyldige appearance-valg, unikke id'er,
  gyldige priser og eksisterende assets.
- Test at standardlooket kun bruger start/gratis-ting.
- Test `ownsWardrobeItem`, `buyWardrobeItem`, dobbeltkøb og migrering af equipped
  tøj.
- Test at `randomizeLook` overholder den tilladte pulje.
- Balance-test: billigste wardrobe-ting kan købes efter en quizrunde, og priserne
  ligger i et fornuftigt interval.
- Kør `npm run lint`, `npm run typecheck`, `npm run test` og `npm run build`.
- Manuel test: ny figur -> kun startvalg; køb i Tøj -> tages på; skab -> låste
  ting åbner butikken; gammel save -> look bevares.
