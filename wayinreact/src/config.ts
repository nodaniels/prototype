// Firebase config loader. Prefer Expo Constants.manifest.extra when present (Expo managed
// apps often inject env via app.config.js), otherwise fall back to process.env.
let dbUrl: string | undefined;
let authToken: string | null = null;

try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Constants = require('expo-constants');
	const extra = Constants?.manifest?.extra ?? Constants?.expoConfig?.extra;
	dbUrl = extra?.FIREBASE_DB_URL ?? extra?.firebase?.dbUrl;
	authToken = extra?.FIREBASE_AUTH ?? null;
} catch (err) {
	// Not running in Expo or Constants not available
}

dbUrl = dbUrl ?? (process.env.FIREBASE_DB_URL as string | undefined) ?? 'https://inno-e44bc-default-rtdb.europe-west1.firebasedatabase.app';
authToken = authToken ?? (process.env.FIREBASE_AUTH as string | null) ?? null;

export const FIREBASE_DB_URL = dbUrl;
export const FIREBASE_AUTH = authToken;
