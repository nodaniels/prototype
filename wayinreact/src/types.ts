/**
 * types.ts - TypeScript type definitioner for hele appen
 * 
 * Indeholder alle interfaces for bygninger, etager, lokaler,
 * søgeresultater og kalenderdata.
 */

// Et lokale på en etage
export interface Room {
  id: string; // Lokale-nummer (f.eks. "S10", "2.17")
  text: string; // Tekst vist på kortet
  x: number; // X-position på etageplanen (0-1, relativ)
  y: number; // Y-position på etageplanen (0-1, relativ)
  font_size?: number; // Original skriftstørrelse fra PDF
  normalized_font_size?: number; // Normaliseret skriftstørrelse
}

// En indgang til bygningen
export interface Entrance {
  text: string; // Tekst for indgangen (f.eks. "Hovedindgang")
  x: number; // X-position på etageplanen (0-1, relativ)
  y: number; // Y-position på etageplanen (0-1, relativ)
  font_size?: number; // Original skriftstørrelse
  normalized_font_size?: number; // Normaliseret skriftstørrelse
}

// Data for en enkelt etage
export interface FloorData {
  originalName: string; // Etagenavn (f.eks. "1_sal", "stue")
  image: string; // Sti til etagebillede
  rooms: Room[]; // Alle lokaler på etagen
  entrances: Entrance[]; // Alle indgange på etagen
}

// Data for en hel bygning
export interface BuildingData {
  originalName: string; // Bygningsnavn
  floors: Record<string, FloorData>; // Alle etager i bygningen
}

// Payload med alle bygninger
export interface BuildingsPayload {
  buildings: Record<string, BuildingData>; // Alle bygninger (nøgle: buildingKey)
}

// Resultat fra lokalesøgning
export interface SearchResult {
  floorKey: string; // Etagenøgle (f.eks. "1_sal")
  floor: FloorData; // Etagedata
  room: Room; // Det fundne lokale
  entrance: Entrance | null; // Nærmeste indgang til lokalet
}

// Opsummering af kalenderaftale
export interface CalendarEventSummary {
  id: string; // Unik ID for aftalen
  title: string; // Titel på aftalen
  startDate: Date; // Starttidspunkt
  location?: string | null; // Lokation (hvis angivet)
}

// En bygning med nøgle og metadata
export interface BuildingEntry {
  key: string; // Bygningsnøgle (f.eks. "solbjerg", "porcelaenshaven")
  data: BuildingData; // Bygningsdata
  name: string; // Displaynavn
}

// Den etage der vises i UI'et
export interface DisplayedFloor {
  floorKey: string; // Etagenøgle
  floor: FloorData; // Etagedata
  room?: Room; // Markeret lokale (hvis søgt)
  entrance?: Entrance | null; // Markeret indgang (hvis søgt)
  fromSearch: boolean; // Om etagen vises pga. søgning
}
