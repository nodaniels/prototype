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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const remote = await fetchRemoteBuildings();
        if (remote && !cancelled) {
          setPayload(remote);
          setError(null);
        } else if (!cancelled) {
          setError('Kunne ikke hente bygningsdata');
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError('Netværksfejl ved hentning af data');
          console.warn('Error fetching remote buildings:', fetchError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { payload, loading, error };
};
