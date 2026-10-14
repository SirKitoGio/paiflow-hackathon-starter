import type { Metadata } from "next";
import { VerifyCard } from "@/components/verify-card";

export const metadata: Metadata = {
  title: "Verify Account — Tranche",
  description: "Verify your Tranche account with a 6-digit verification code.",
};

export default function Page() {
  return <VerifyCard />;
}
