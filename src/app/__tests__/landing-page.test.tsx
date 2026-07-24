import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import LandingPage from "../page";

describe("landing page", () => {
  test("renders the marketing-first detailing experience", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Bold, convenient car detailing built for local customers." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Request Car Detailing" })).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "Start with a simple quote request" })).toBeInTheDocument();
    expect(screen.getByText("Choose the detail that fits the job")).toBeInTheDocument();
    expect(screen.getByText("Built around convenience and local service")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Frequently asked questions" })).toBeInTheDocument();
  });
});
