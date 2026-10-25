# Plan: Sæsoner og højtider – followup

**Oprettet:** 25. oktober 2026
**Status:** Implementeret
**Spil:** Gotar

## Mål

Gøre sæson- og højtidstemaet mere levende uden at ændre spilmekanikken:

1. Brug de eksisterende sæsonhilsener.
2. Gør temamarkeringen i menuen trykvenlig med et informationskort.
3. Variér pynten, så rummene ikke får to ens motiver.
4. Test alle dage i en årrække.
5. Tilføj sæsonvarer til butikken.
6. Tilføj sæsonbestemt dyrepynt.

## Implementering

- Menupillen viser både “I dag: …” og højtidens hilsen. Den har et
  spørgsmålstegn og åbner et informationskort med ikon, beskrivelse, “Læs
  højt” og “Luk”.
- `text.seasons.descriptions` og `SeasonThemeDefinition.info` bruges i
  informationskortet.
- Indendørs pynt består nu af ét stort motiv og en lille guirlande i
  temaets farver. Menu og udendørs scener bruger et stort motiv og et mindre,
  spejlet accentmotiv.
- `tests/season.test.ts` gennemgår alle dage 2024–2030 og kræver, at alle
  højtider optræder hvert år.
- Butikken har fået sæsonvarer:
  græskarlygte, juletræ, sankthansbål, påskeæg og strandbold.
- Dyrepynt har fået nissehue, kaninører, blomsterkrans og efterårstørklæde.
- Sæsonvarer har `season`-metadata, er altid oplåste, sorteres først i deres
  kategori i den aktuelle sæson og vises med en stjerne.
- Huer, ører og kranse har fået deres egen placering på kæledyret, så de
  sidder på hovedet i stedet for over ansigtet. Skærf og eksisterende pynt
  bruger stadig standardplaceringen.

## Filer

**Nye**

- `src/ui/SeasonInfoModal.ts`
- `src/assets/furniture/furniture-pumpkin.svg`
- `src/assets/furniture/furniture-christmas-tree.svg`
- `src/assets/furniture/furniture-bonfire.svg`
- `src/assets/toys/toy-easter-eggs.svg`
- `src/assets/toys/toy-beach-ball.svg`
- `src/assets/items/accessory-santa-hat.svg`
- `src/assets/items/accessory-bunny-ears.svg`
- `src/assets/items/accessory-flower-wreath.svg`
- `src/assets/items/accessory-autumn-scarf.svg`
- `.opencode/plans/2026-10-25-saesoner-followup.md`

**Ændrede**

- `src/game/catalog/seasons.ts`
- `src/game/catalog/items.ts`
- `src/game/catalog/toys.ts`
- `src/game/assets.ts`
- `src/game/text.ts`
- `src/ui/SeasonDecor.ts`
- `src/ui/ItemCard.ts`
- `src/ui/PetView.ts`
- `src/scenes/MenuScene.ts`
- `src/scenes/ShopScene.ts`
- `tests/catalog.test.ts`
- `tests/season.test.ts`

## Verifikation

- `npm run lint`
- `npm run typecheck`
- `npm run test` (220 tests)
- `npm run build`
- Manuelt i Chrome: menu, informationskort, hjem med guirlande, butikkens
  sæsonfremhævning, nissehue, kaninører og blomsterkrans på kæledyret.
