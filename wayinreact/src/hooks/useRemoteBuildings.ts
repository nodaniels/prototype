import { useEffect, useState } from 'react';
import { FIREBASE_DB_URL, FIREBASE_AUTH } from '../config';
import type { BuildingsPayload } from '../types';

const emptyPayload: BuildingsPayload = { buildings: {} } as BuildingsPayload;

const fetchRemoteBuildings = async (): Promise<BuildingsPayload | null> => {
  try {
    const url = `${FIREBASE_DB_URL.replace(/\/$/, '')}/buildings.json`;
    const params = FIREBASE_AUTH ? `?auth=${encodeURIComponent(FIREBASE_AUTH)}` : '';
    const resp = await fetch(url + params, { cache: 'no-store' });
    if (!resp.ok) {
      console.warn('Failed to fetch remote buildings:', resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    // Basic validation: must have buildings key
    if (!data || typeof data !== 'object' || !data.buildings) {
      console.warn('Remote buildings payload invalid');
      return null;
    }
    return data as BuildingsPayload;
  } catch (err) {
    console.warn('Error fetching remote buildings:', err);
    return null;
  }
};

export const useRemoteBuildings = () => {
  const [payload, setPayload] = useState<BuildingsPayload>(emptyPayload);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteBuildings();
      if (remote && !cancelled) {
        setPayload(remote);
        return;
      }
      // Remote fetch failed; leave payload empty until data becomes available.
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { payload };
};
