import { useAppStore } from "@/store/appStore";
import { ConnectPanel } from "@/components/ConnectPanel";
import { Dashboard } from "@/pages/Dashboard";

export default function App() {
  const isConnected = useAppStore((s) => s.isConnected);

  return isConnected ? <Dashboard /> : <ConnectPanel />;
}
