import { isEligibleForReview } from "@/lib/review";

describe("review eligibility", () => {
  it("eligible", () => { expect(isEligibleForReview({ optedOut: false, enabled: true, reviewUrl: "https://x" })).toBe(true); });
  it("not eligible if opted out", () => { expect(isEligibleForReview({ optedOut: true, enabled: true, reviewUrl: "https://x" })).toBe(false); });
  it("not eligible if disabled", () => { expect(isEligibleForReview({ optedOut: false, enabled: false, reviewUrl: "https://x" })).toBe(false); });
  it("not eligible if no review url", () => { expect(isEligibleForReview({ optedOut: false, enabled: true, reviewUrl: null })).toBe(false); });
});