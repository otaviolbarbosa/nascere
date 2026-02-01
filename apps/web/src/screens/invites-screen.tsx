"use client";
import { Header } from "@/components/layouts/header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Invite } from "@/types";
import { professionalTypeLabels } from "@/utils/team";
import dayjs from "dayjs";
import { Baby, Calendar, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type InvistesScreenProps = {
  invites: Invite[];
};

export default function InvitesScreen({ invites }: InvistesScreenProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleAction(inviteId: string, action: "accept" | "reject") {
    setProcessingId(inviteId);

    try {
      const response = await fetch(`/api/team/invites/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar convite");
      }

      toast.success(action === "accept" ? "Convite aceito!" : "Convite rejeitado");

      //   setInvites(invites.filter((i) => i.id !== inviteId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar convite");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div>
      <Header title="Convites" />
      <div className="p-4 pt-0 md:p-6">
        <PageHeader description="Convites recebidos para participar de equipes" />

        {invites.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Nenhum convite pendente"
            description="Você não tem convites pendentes para participar de equipes."
          />
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <Card key={invite.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{invite.patient?.name}</CardTitle>
                      <CardDescription>
                        Convidado por {invite.inviter?.name}
                        <Badge variant="outline">
                          {professionalTypeLabels[invite.inviter?.professional_type || ""]}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {invite.professional_type && professionalTypeLabels[invite.professional_type]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
                      {invite.patient?.dum && (
                        <div className="flex items-center gap-1">
                          <Baby className="h-4 w-4" />
                          <span>{invite.patient.dum} semanas</span>
                        </div>
                      )}
                      {invite.patient?.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>DPP: {dayjs(invite.patient.due_date).format("DD/MM/YYYY")}</span>
                        </div>
                      )}
                      <span>Expira em {dayjs(invite.expires_at).format("DD/MM/YYYY")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleAction(invite.id, "reject")}
                        disabled={processingId === invite.id}
                        className="flex-1"
                      >
                        Recusar
                      </Button>
                      <Button
                        onClick={() => handleAction(invite.id, "accept")}
                        disabled={processingId === invite.id}
                        className="flex-1"
                      >
                        Aceitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
