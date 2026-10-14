import { Cormorant_Garamond, Inter, Montserrat } from "next/font/google";
import { GroupDashboard } from "@/components/group-dashboard";

const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--gd-font-body" });
const head = Montserrat({ subsets: ["latin"], weight: ["700", "800"], variable: "--gd-font-head" });
const brand = Cormorant_Garamond({ subsets: ["latin"], weight: ["500"], variable: "--gd-font-brand" });

export const metadata = {
  title: "Antipolo Trip — Tranche",
};

export default function GroupPage() {
  return (
    <div className={`${body.variable} ${head.variable} ${brand.variable}`}>
      <GroupDashboard />
    </div>
  );
}
