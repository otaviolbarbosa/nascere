import { Header } from "@/components/layouts/header";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen flex-1">
      <Header title="Configurações" />
      <div className="flex flex-1 justify-center items-center">Settings</div>
    </div>
  );
}
