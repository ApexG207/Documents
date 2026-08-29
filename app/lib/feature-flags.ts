export const featureFlagDefaults = {
  core_training: true,
  competition_portfolio: true,
  ai_video_analysis: false,
  minor_media_upload: false,
  academy_payouts: false,
  community_forum: false,
  native_store_payments: false,
  automated_agent_actions: false,
} as const;

export type FeatureFlagName = keyof typeof featureFlagDefaults;

function envName(flag: FeatureFlagName) {
  return "MATIQ_FEATURE_" + flag.toUpperCase();
}

export function isFeatureEnabled(
  flag: FeatureFlagName,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  const configured = environment[envName(flag)];
  if (configured === undefined || configured === "") return featureFlagDefaults[flag];
  if (configured === "true" || configured === "1") return true;
  if (configured === "false" || configured === "0") return false;
  throw new Error("Invalid boolean value for " + envName(flag));
}

export function featureFlagSnapshot(environment: NodeJS.ProcessEnv = process.env) {
  return Object.fromEntries(
    (Object.keys(featureFlagDefaults) as FeatureFlagName[]).map((flag) => [
      flag,
      isFeatureEnabled(flag, environment),
    ]),
  ) as Record<FeatureFlagName, boolean>;
}
