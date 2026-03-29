"use client";

import { addEnterpriseProfessionalAction } from "@/actions/add-enterprise-professional-action";
import { removeEnterpriseProfessionalAction } from "@/actions/remove-enterprise-professional-action";
import { Header } from "@/components/layouts/header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProfessionalCard } from "@/components/shared/professional-card";
import { StaffCard } from "@/components/shared/staff-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EnterpriseStaffMember } from "@/services/enterprise-users";
import type { EnterpriseProfessional } from "@/services/professional";
import { BriefcaseMedical, Stethoscope, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type UsersScreenProps = {
  professionals: EnterpriseProfessional[];
  staff: EnterpriseStaffMember[];
};

export default function UsersScreen({ professionals, staff }: UsersScreenProps) {
  const router = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [professionalToRemove, setProfessionalToRemove] = useState<EnterpriseProfessional | null>(
    null,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleAddProfessional() {
    if (!emailInput.trim()) return;
    setIsAdding(true);
    try {
      const result = await addEnterpriseProfessionalAction({ email: emailInput.trim() });
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      toast.success(`${result?.data?.name ?? "Profissional"} adicionado com sucesso!`);
      setShowAddModal(false);
      setEmailInput("");
      router.refresh();
    } catch {
      toast.error("Erro ao adicionar profissional.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveProfessional() {
    if (!professionalToRemove) return;
    setIsRemoving(true);
    try {
      const result = await removeEnterpriseProfessionalAction({
        professionalId: professionalToRemove.id,
      });
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      toast.success(`${professionalToRemove.name ?? "Profissional"} removido da organização.`);
      setProfessionalToRemove(null);
      router.refresh();
    } catch {
      toast.error("Erro ao remover profissional.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div>
      <Header title="Colaboradores" />
      <div className="p-4 pt-0 md:p-6 md:pt-0">
        <PageHeader description="">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              className="gradient-primary flex sm:hidden"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="size-4" />
            </Button>
            <Button
              className="gradient-primary hidden sm:flex"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="size-4" />
              Adicionar Profissional
            </Button>
          </div>
        </PageHeader>

        <Tabs defaultValue="professionals" className="mt-4">
          <TabsList className="mb-4 w-full max-w-xs">
            <TabsTrigger value="professionals">
              Profissionais
              {professionals.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                  {professionals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="staff">
              Gestores
              {staff.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                  {staff.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Profissionais */}
          <TabsContent value="professionals">
            {professionals.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="Nenhum profissional cadastrado"
                description="Adicione profissionais já cadastrados na plataforma pelo e-mail."
              >
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="size-4" />
                  Adicionar Profissional
                </Button>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {professionals.map((professional) => (
                  <ProfessionalCard
                    key={professional.id}
                    professional={professional}
                    onRemove={setProfessionalToRemove}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Gestores */}
          <TabsContent value="staff">
            {staff.length === 0 ? (
              <EmptyState
                icon={BriefcaseMedical}
                title="Nenhum gestor cadastrado"
                description="Gestoras e secretárias da organização aparecerão aqui."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((member) => (
                  <StaffCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: Adicionar Profissional */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Profissional</DialogTitle>
            <DialogDescription>
              Informe o e-mail de um profissional já cadastrado na plataforma para associá-lo à sua
              organização.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-input">E-mail do profissional</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="profissional@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProfessional()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isAdding}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary"
              onClick={handleAddProfessional}
              disabled={!emailInput.trim() || isAdding}
            >
              {isAdding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Remoção */}
      <Dialog
        open={!!professionalToRemove}
        onOpenChange={(open) => !open && setProfessionalToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover profissional</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <span className="font-medium text-foreground">
                {professionalToRemove?.name ?? "este profissional"}
              </span>{" "}
              da organização? Ele perderá o acesso às funcionalidades da organização.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProfessionalToRemove(null)}
              disabled={isRemoving}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemoveProfessional} disabled={isRemoving}>
              {isRemoving ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
