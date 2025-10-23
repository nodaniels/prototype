import { useCallback, useEffect, useState } from 'react';
import * as Calendar from 'expo-calendar';
import type { PermissionState } from '../constants';

export const useCalendarPermissions = () => {
  const [calendarPermissionStatus, setCalendarPermissionStatus] =
    useState<PermissionState>('undetermined');
  const [calendarLookupError, setCalendarLookupError] = useState<string | null>(null);

  const refreshCalendarPermission = useCallback(async () => {
    try {
      const response = await Calendar.getCalendarPermissionsAsync();
      setCalendarPermissionStatus(response.status as PermissionState);
    } catch (error) {
      console.warn('Failed to read calendar permission status', error);
      setCalendarPermissionStatus('denied');
    }
  }, []);

  const ensureCalendarAccess = useCallback(async () => {
    try {
      const current = await Calendar.getCalendarPermissionsAsync();
      setCalendarPermissionStatus(current.status as PermissionState);
      if (current.status === 'granted') {
        setCalendarLookupError(null);
        return true;
      }

      if (current.status === 'denied' && !current.canAskAgain) {
        setCalendarLookupError(
          'WayInn mangler adgang til din kalender. Aktivér tilladelsen i Indstillinger.',
        );
        return false;
      }

      const requested = await Calendar.requestCalendarPermissionsAsync();
      setCalendarPermissionStatus(requested.status as PermissionState);
      if (requested.status !== 'granted') {
        setCalendarLookupError(
          'WayInn fik ikke adgang til kalenderen. Åbn Indstillinger for at aktivere tilladelsen.',
        );
        return false;
      }

      setCalendarLookupError(null);
      return true;
    } catch (error) {
      console.warn('Calendar permission error', error);
      setCalendarLookupError('Der opstod en fejl ved anmodning om kalenderadgang.');
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshCalendarPermission();
    })();
  }, [refreshCalendarPermission]);

  return {
    calendarPermissionStatus,
    calendarLookupError,
    setCalendarLookupError,
    refreshCalendarPermission,
    ensureCalendarAccess,
  };
};
