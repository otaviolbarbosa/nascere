import { Header } from "@/components/layouts/header";
import SettingsScreen from "@/screens/settings-screen";

export default function SettingsPage() {
  return (
    <div className="flex h-screen flex-1 flex-col">
      <Header title="Configurações" back />
      <SettingsScreen />
    </div>
  );
}
