export interface Room {
  id: string;
  text: string;
  x: number;
  y: number;
  font_size?: number;
  normalized_font_size?: number;
}

export interface Entrance {
  text: string;
  x: number;
  y: number;
  font_size?: number;
  normalized_font_size?: number;
}

export interface FloorData {
  originalName: string;
  image: string;
  rooms: Room[];
  entrances: Entrance[];
}

export interface BuildingData {
  originalName: string;
  floors: Record<string, FloorData>;
}

export interface BuildingsPayload {
  buildings: Record<string, BuildingData>;
}

export interface SearchResult {
  floorKey: string;
  floor: FloorData;
  room: Room;
  entrance: Entrance | null;
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  startDate: Date;
  location?: string | null;
}

export interface BuildingEntry {
  key: string;
  data: BuildingData;
  name: string;
}

export interface DisplayedFloor {
  floorKey: string;
  floor: FloorData;
  room?: Room;
  entrance?: Entrance | null;
  fromSearch: boolean;
}
