/**
 * Application constants and configuration
 */

export const BUILDING_CODE_MAP: Record<string, string> = {
  SP: 'solbjerg',
  PH: 'porcelaenshaven',
};

export interface InstitutionOption {
  id: string;
  name: string;
  organization: string;
  region: string;
  campuses: string[];
}

export const INSTITUTION_OPTIONS: InstitutionOption[] = [
  {
    id: 'novo',
    name: 'Novo Nordisk',
    organization: 'Life science',
    region: 'Bagsværd, Danmark',
    campuses: ['Bagsværd HQ', 'Fremtidens laboratorier', 'Kalundborg Production'],
  },
  {
    id: 'cbs',
    name: 'Copenhagen Business School',
    organization: 'Universitet',
    region: 'Frederiksberg, København',
    campuses: ['Solbjerg Campus', 'Porcelænshaven Campus', 'Dalgas Have'],
  },
  {
    id: 'maersk',
    name: 'A.P. Møller - Mærsk',
    organization: 'Shipping & logistics',
    region: 'København Ø, Danmark',
    campuses: ['Esplanaden HQ', 'Terminal Operations'],
  },
];

export type TabKey = 'home' | 'institutions' | 'settings';

export type PermissionState = 'undetermined' | 'granted' | 'denied';
