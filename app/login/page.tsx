import type { Metadata } from "next";
import { LoginCard } from "@/components/login-card";

export const metadata: Metadata = {
  title: "Log in — Tranche",
  description: "Log in to Tranche to start saving in tranches.",
};

export default function Page() {
  return <LoginCard />;
}
