import { createFileRoute } from "@tanstack/react-router";
import { EmployeePage } from "@/pages/EmployeePage";

export const Route = createFileRoute("/employee")({
  head: () => ({
    meta: [
      { title: "Employee Portal · OnboardFlow AI" },
      {
        name: "description",
        content:
          "Submit an Acme Corp onboarding request in plain English and watch the AI agent process it live.",
      },
      { property: "og:title", content: "Employee Portal · OnboardFlow AI" },
      {
        property: "og:description",
        content: "Submit onboarding requests and track your AI agent in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmployeePage,
});
