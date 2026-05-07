import { PatientsTable } from "./_components/patients-table";

export default function PatientsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bold text-2xl text-foreground">Pacientes</h1>
      </div>
      <PatientsTable />
    </div>
  );
}
