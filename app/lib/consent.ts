/**
 * Consent vocabulary shared by the route that records guardian consent and every
 * route that enforces it.
 *
 * These values previously diverged: `/api/consents` wrote "granted" while media
 * intake required "approved", so no minor upload could ever satisfy the gate.
 * The mismatch failed closed, but it silently disabled the safeguarding feature.
 * Keeping the vocabulary in one module makes that class of drift a type error
 * rather than a runtime dead end.
 */
export const CONSENT_GRANTED = "granted";
export const CONSENT_DECLINED = "declined";
export const CONSENT_REVOKED = "revoked";

export type ConsentStatus =
  | typeof CONSENT_GRANTED
  | typeof CONSENT_DECLINED
  | typeof CONSENT_REVOKED;

/** Scopes that authorise retaining competition or training footage of a minor. */
export const MEDIA_CONSENT_SCOPES = ["Internal match video", "Performance records"] as const;

/** Collapse caller-supplied input to an affirmative or negative record. */
export function normalizeConsentStatus(value: unknown): ConsentStatus {
  return value === CONSENT_GRANTED ? CONSENT_GRANTED : CONSENT_DECLINED;
}
