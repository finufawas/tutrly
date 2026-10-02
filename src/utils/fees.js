import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toISO } from './tutor';

/*
  settings/platform document:
  {
    commissionRate: 5,          // fee in force now
    nextRate: 7,                // optional scheduled fee
    nextRateFrom: '2026-11-01'  // YYYY-MM-DD the scheduled fee starts
  }
*/
export const DEFAULT_FEE = 5;

export async function fetchFeeSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    return snap.exists() ? snap.data() : { commissionRate: DEFAULT_FEE };
  } catch (e) {
    return { commissionRate: DEFAULT_FEE };
  }
}

// Fee that applies on a given date (defaults to today)
export function effectiveFee(settings = {}, iso = toISO(new Date())) {
  const base = settings.commissionRate ?? DEFAULT_FEE;
  if (settings.nextRate != null && settings.nextRateFrom && iso >= settings.nextRateFrom) return Number(settings.nextRate);
  return Number(base);
}

export const takeHome = (rate, fee) => Math.round(Number(rate || 0) * (1 - Number(fee || 0) / 100));
