export function isEligibleForReview(params: { optedOut: boolean; enabled: boolean; reviewUrl: string | null }): boolean {
  if (params.optedOut) return false;
  if (!params.enabled) return false;
  if (!params.reviewUrl) return false;
  return true;
}