import { Dashboard } from "@/components/dashboard";
import { getSecondBrainData } from "@/lib/brain-data";

export default function Home() {
  const data = getSecondBrainData();
  return <Dashboard {...data} />;
}
