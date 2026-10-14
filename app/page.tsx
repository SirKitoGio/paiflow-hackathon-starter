import { publicConfig } from "@/lib/paiflow";
import { StarterApp } from "@/components/starter-app";
import { Hero } from "@/components/hero";

export const dynamic = "force-dynamic";

export default async function Page() {
  const config = publicConfig();
  return (
    <>
      <Hero />
      <StarterApp config={config} />
    </>
  );
}
