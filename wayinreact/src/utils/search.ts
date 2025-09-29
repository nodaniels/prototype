import type { BuildingData, Entrance, FloorData, Room, SearchResult } from '../types';

const normalizeQuery = (query: string) => query.trim().toUpperCase();

const isGroundFloor = (key: string, floor: FloorData) => {
  const haystack = `${key} ${floor.originalName}`.toLowerCase();
  return haystack.includes('stue') || haystack.includes('ground') || /(^|[^\d])0([^\d]|$)/.test(haystack);
};

const toDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const collectEntrances = (floors: Record<string, FloorData>): Entrance[] => {
  const entries = Object.entries(floors);
  const ground = entries.filter(([key, floor]) => isGroundFloor(key, floor));
  const pool = (ground.length > 0 ? ground : entries)
    .flatMap(([, floor]) => floor.entrances ?? [])
    .filter(Boolean);
  return pool;
};

const nearestEntrance = (floors: Record<string, FloorData>, room: Room): Entrance | null => {
  const entrances = collectEntrances(floors);
  if (entrances.length === 0) {
    return null;
  }
  return entrances.reduce<Entrance | null>((closest, current) => {
    if (!closest) {
      return current;
    }
    const currentDistance = toDistance(current, room);
    const closestDistance = toDistance(closest, room);
    return currentDistance < closestDistance ? current : closest;
  }, null);
};

export const searchRoomInBuilding = (building: BuildingData, query: string): SearchResult | null => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return null;
  }

  for (const [floorKey, floor] of Object.entries(building.floors)) {
    for (const room of floor.rooms) {
      if (room.id.toUpperCase() === normalized) {
        return {
          floorKey,
          floor,
          room,
          entrance: nearestEntrance(building.floors, room),
        };
      }
    }
  }

  return null;
};

export const listRoomIds = (building: BuildingData): string[] => {
  const ids = new Set<string>();
  for (const floor of Object.values(building.floors)) {
    for (const room of floor.rooms) {
      ids.add(room.id.toUpperCase());
    }
  }
  return Array.from(ids).sort();
};
