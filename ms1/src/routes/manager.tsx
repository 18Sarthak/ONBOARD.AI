import { createFileRoute } from "@tanstack/react-router";
import { ManagerPage } from "@/pages/ManagerPage";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Manager Dashboard · OnboardFlow AI" },
      {
        name: "description",
        content:
          "Approve or reject Acme Corp onboarding requests, watch the agent activity log, and run the SLA sweep.",
      },
      { property: "og:title", content: "Manager Dashboard · OnboardFlow AI" },
      {
        property: "og:description",
        content: "Approvals queue, live agent activity log, and SLA escalation sweep.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagerPage,
});
