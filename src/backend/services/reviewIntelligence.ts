import type { Review } from "../types/domain";

type JiraPayload = {
  title: string;
  description: string;
  rootCause: string;
  reproductionSteps: string[];
  suggestedPatch: string;
  testSummary: string;
};

export type ComplaintCluster = {
  clusterId: string;
  theme: string;
  reviews: Review[];
  likelyCodeAreas: string[];
  jiraPayload: JiraPayload;
  testFirstPatch?: string;
};

const themeKeywords: Record<string, string[]> = {
  "Battery Drain": ["battery", "drain", "charge", "power"],
  "Recommendation Quality": ["recommend", "irrelevant", "wrong", "suggestion"],
  "Checkout Failure": ["checkout", "payment", "failed", "promo", "total"]
};

function detectTheme(reviewText: string): string {
  const text = reviewText.toLowerCase();
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) return theme;
  }
  return "General Experience";
}

function mapCodeAreas(theme: string): string[] {
  switch (theme) {
    case "Battery Drain":
      return ["src/backend/services/powerProfile.ts", "app/products/[id]/page.tsx"];
    case "Recommendation Quality":
      return ["src/backend/services/catalog.ts", "components/AIRecommendationsCarousel.tsx"];
    case "Checkout Failure":
      return ["src/backend/services/checkout.ts", "app/checkout/page.tsx"];
    default:
      return ["app/page.tsx", "src/backend/services/catalog.ts"];
  }
}

// DEMO: Trigger review clustering by passing customer reviews with repeated keywords.
export function clusterReviewsIntoTickets(reviews: Review[], includeTestFirstPatch = false): ComplaintCluster[] {
  const grouped = new Map<string, Review[]>();

  for (const review of reviews) {
    const theme = detectTheme(review.body);
    grouped.set(theme, [...(grouped.get(theme) ?? []), review]);
  }

  return [...grouped.entries()].map(([theme, clusterReviews], index) => {
    const likelyCodeAreas = mapCodeAreas(theme);

    const jiraPayload: JiraPayload = {
      title: `[VOC] ${theme} complaints rising`,
      description: `Clustered ${clusterReviews.length} customer reviews around '${theme}'.`,
      rootCause: `Likely logic or model-quality regression in ${theme.toLowerCase()} flow.`,
      reproductionSteps: [
        "Replay user flow from clustered review text.",
        "Capture logs and compare expected behavior.",
        "Validate issue recurrence across multiple sessions."
      ],
      suggestedPatch: `Inspect ${likelyCodeAreas.join(", ")} and add guards/fixes for ${theme.toLowerCase()}.`,
      testSummary: "Add regression tests for clustered complaint scenarios with fixtures from customer feedback."
    };

    return {
      clusterId: `voc-${index + 1}`,
      theme,
      reviews: clusterReviews,
      likelyCodeAreas,
      jiraPayload,
      testFirstPatch: includeTestFirstPatch
        ? `// test-first patch sketch\n// 1) add failing test for ${theme}\n// 2) implement minimal fix\n// 3) run regression suite`
        : undefined
    };
  });
}
