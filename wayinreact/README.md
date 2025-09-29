# Wayfinding React Native App

Expo/React Native version af bygningenavigations-prototypen.

## Funktioner

- Vælg bygning og søg efter lokaler
- Automatisk etagevalg med grønt markeret lokale
- Orange markering af nærmeste indgang (fra stueplan)
- Offline data genereret fra PDF'erne (se `export_building_data.py`)

## Kom godt i gang

1. **Installer dependencies**

   ```bash
   npm install
   ```

2. **Start udviklingsserveren**

   ```bash
   npm run start
   ```

   Brug Expo Go eller en emulator til at åbne appen.

## Regenerering af data

Hvis PDF'erne opdateres, kan du køre scriptet i rodmappen:

```bash
python export_building_data.py
```

Dette opdaterer JSON-data og floorplan-billeder i `wayinreact/assets`.

## Arkitektur

- `App.tsx` – hovedapp med navigation og søgning
- `src/components/` – UI-komponenter (bygningvælger og floor viewer)
- `src/utils/search.ts` – domænelogik for lokalesøgning og nearest entrance
- `src/data/` – genererede data og billede-manifest

## Krav

- Node.js 18+
- Expo CLI (`npx expo`) for lokale builds
