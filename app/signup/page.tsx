import type { Metadata } from "next";
import { SignupCard } from "@/components/signup-card";

export const metadata: Metadata = {
  title: "Sign up — Tranche",
  description: "Create an account on Tranche to start saving in tranches.",
};

export default function Page() {
  return <SignupCard />;
}
