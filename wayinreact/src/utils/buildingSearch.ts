import { BUILDING_CODE_MAP } from '../constants';
import type { BuildingData, SearchResult } from '../types';
import { searchRoomInBuilding } from './search';

export const createCandidatesFromLocation = (
  buildingKey: string,
  token: string,
  context?: string,
  buildingCode?: string,
): string[] => {
  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    if (!value) {
      return;
    }
    const normalized = value.replace(/\s+/g, '');
    if (!normalized) {
      return;
    }
    const upper = normalized.toUpperCase();
    if (!candidates.includes(upper)) {
      candidates.push(upper);
    }
  };

  const normalizedToken = token.trim().toUpperCase();
  const contextTokens = (() => {
    if (!context) {
      return normalizedToken ? [normalizedToken] : [];
    }
    const extracted = context
      .split(/[\s,.;:()•-]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.toUpperCase());
    if (normalizedToken) {
      extracted.unshift(normalizedToken);
    }
    return Array.from(new Set(extracted)).slice(0, 5);
  })();

  if (!contextTokens.length) {
    return candidates;
  }

  if (buildingKey === 'solbjerg') {
    const addVariants = (raw: string) => {
      const sanitized = raw.replace(/[^A-Z0-9]/g, '');
      if (!sanitized) {
        return;
      }
      pushCandidate(sanitized);

      if (buildingCode) {
        pushCandidate(`${buildingCode}${sanitized}`);
      }

      const digitsOnly = sanitized.replace(/\D/g, '');
      if (digitsOnly) {
        pushCandidate(digitsOnly);
        if (buildingCode) {
          pushCandidate(`${buildingCode}${digitsOnly}`);
        }
      }
    };

    contextTokens.forEach(addVariants);

    for (let i = 0; i < contextTokens.length - 1; i += 1) {
      const combined = `${contextTokens[i]}${contextTokens[i + 1]}`;
      addVariants(combined);
    }
    return candidates;
  }

  if (buildingKey === 'porcelaenshaven') {
    const primaryToken = contextTokens[0] ?? '';
    const sanitized = primaryToken.replace(/[^A-Z0-9.]/g, '.');
    const segments = sanitized.split('.').filter(Boolean);
    const numericSegments = segments.map((segment) => segment.replace(/\D/g, '')).filter(Boolean);
    let relevantSegments = numericSegments;
    if (numericSegments.length > 2) {
      relevantSegments = numericSegments.slice(-2);
    }

    let floorPart: string | null = null;
    let roomPart: string | null = null;

    if (relevantSegments.length >= 2) {
      [floorPart, roomPart] = relevantSegments;
    } else if (relevantSegments.length === 1) {
      roomPart = relevantSegments[0];
    }

    if (floorPart && roomPart) {
      pushCandidate(`${floorPart}${roomPart}`);
      pushCandidate(`${floorPart}.${roomPart}`);
    }
    if (roomPart) {
      pushCandidate(roomPart);
    }

    contextTokens.slice(1, 3).forEach((part) => {
      const cleaned = part.replace(/[^A-Z0-9.]/g, '');
      if (cleaned) {
        pushCandidate(cleaned);
      }
    });

    return candidates;
  }

  contextTokens.forEach((value) => {
    pushCandidate(value.replace(/[^A-Z0-9]/g, ''));
  });
  return candidates;
};

export const searchAcrossBuildings = (
  query: string,
  buildings: Record<string, unknown>,
): { buildingKey: string; result: SearchResult } | null => {
  const normalized = query.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  for (const [buildingKey, building] of Object.entries(buildings)) {
    const match = searchRoomInBuilding(building as BuildingData, normalized);
    if (match) {
      return { buildingKey, result: match };
    }
  }
  return null;
};

export const extractRoomFromText = (
  input: string,
  buildings: Record<string, unknown>,
): { buildingKey: string; result: SearchResult } | null => {
  if (!input.trim()) {
    return null;
  }

  const locationMatch = input.match(/lokalitet\s*:\s*([^\n]+)/i);
  if (locationMatch) {
    const locationValueRaw = locationMatch[1].trim();
    const locationValueUpper = locationValueRaw.toUpperCase();

    for (const [code, buildingKey] of Object.entries(BUILDING_CODE_MAP)) {
      const codeIndex = locationValueUpper.indexOf(code);
      if (codeIndex === -1) {
        continue;
      }

      const remainder = locationValueRaw.slice(codeIndex + code.length).trim();
      const primaryToken = remainder.split(/\s+/)[0] ?? '';
      const building = buildings[buildingKey] as BuildingData;
      if (!building) {
        continue;
      }

      const candidates = createCandidatesFromLocation(
        buildingKey,
        primaryToken,
        remainder,
        code,
      );
      for (const candidate of candidates) {
        const match = searchRoomInBuilding(building, candidate);
        if (match) {
          return { buildingKey, result: match };
        }
      }
    }
  }

  const directMatch = searchAcrossBuildings(input, buildings);
  if (directMatch) {
    return directMatch;
  }

  const tokens = input.match(/[A-ZÆØÅ0-9._-]+/gi);
  if (tokens) {
    for (const rawToken of tokens) {
      const normalizedToken = rawToken.trim().toUpperCase();
      if (!normalizedToken) {
        continue;
      }

      const variants = new Set<string>([normalizedToken]);
      const sanitized = normalizedToken.replace(/[^A-Z0-9]/g, '');
      if (sanitized) {
        variants.add(sanitized);
        const digitsOnly = sanitized.replace(/\D/g, '');
        if (digitsOnly) {
          variants.add(digitsOnly);
        }
        const withoutPrefix = sanitized.replace(/^[A-Z]{1,3}/, '');
        if (withoutPrefix && withoutPrefix !== sanitized) {
          variants.add(withoutPrefix);
        }
      }

      for (const [code, buildingKey] of Object.entries(BUILDING_CODE_MAP)) {
        const building = buildings[buildingKey] as BuildingData | undefined;
        if (!building) {
          continue;
        }
        if (normalizedToken.startsWith(code)) {
          const remainder = normalizedToken.slice(code.length).trim();
          if (remainder) {
            variants.add(remainder);
            variants.add(remainder.replace(/[^A-Z0-9]/g, ''));
          }
        }
        const locationVariants = createCandidatesFromLocation(
          buildingKey,
          normalizedToken,
          normalizedToken,
          code,
        );
        locationVariants.forEach((variant) => variants.add(variant));
      }

      for (const variant of variants) {
        const match = searchAcrossBuildings(variant, buildings);
        if (match) {
          return match;
        }
      }
    }
  }

  return null;
};

export const isGroundFloor = (key: string, floor: { originalName: string }) => {
  const haystack = `${key} ${floor.originalName}`.toLowerCase();
  return (
    haystack.includes('stue') ||
    haystack.includes('ground') ||
    /(^|[^\d])0([^\d]|$)/.test(haystack)
  );
};
