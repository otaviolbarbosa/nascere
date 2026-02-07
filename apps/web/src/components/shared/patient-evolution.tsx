"use client";

import { ContentModal } from "@/components/shared/content-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { dayjs } from "@/lib/dayjs";
import { type CreateEvolutionInput, createEvolutionSchema } from "@/lib/validations/evolution";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type Evolution = {
  id: string;
  patient_id: string;
  professional_id: string;
  content: string;
  created_at: string;
  professional: { id: string; name: string } | null;
};

type PatientEvolutionProps = {
  patientId: string;
};

function EvolutionForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: CreateEvolutionInput) => void;
  loading: boolean;
}) {
  const form = useForm<CreateEvolutionInput>({
    resolver: zodResolver(createEvolutionSchema),
    defaultValues: { content: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evolução</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva a evolução da paciente..." rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" className="gradient-primary" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function PatientEvolution({ patientId }: PatientEvolutionProps) {
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvolutions = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/evolutions`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvolutions(data.evolutions);
    } catch {
      toast.error("Erro ao carregar evoluções");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchEvolutions();
  }, [fetchEvolutions]);

  const handleSubmit = async (data: CreateEvolutionInput) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/evolutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar evolução");
        return;
      }

      const { evolution } = await res.json();
      setEvolutions((prev) => [evolution, ...prev]);
      setShowModal(false);
      toast.success("Evolução registrada com sucesso");
    } catch {
      toast.error("Erro ao salvar evolução");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-10" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gradient-primary" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          <span className="ml-2 hidden md:block">Adicionar Evolução</span>
        </Button>
      </div>

      {evolutions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma evolução registrada"
          description="Registre a evolução da paciente para acompanhar o histórico de atendimentos."
        >
          <Button size="sm" className="gradient-primary" onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Evolução
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {evolutions.map((evolution) => (
            <div
              key={evolution.id}
              className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="whitespace-pre-wrap text-sm">{evolution.content}</p>
              <p className="mt-3 text-muted-foreground text-xs">
                Registro adicionado por: {evolution.professional?.name || "Desconhecido"}, em{" "}
                {dayjs(evolution.created_at).format("DD/MM/YYYY [às] HH:mm")}
              </p>
            </div>
          ))}
        </div>
      )}

      <ContentModal
        open={showModal}
        onOpenChange={setShowModal}
        title="Nova Evolução"
        description="Registre a evolução da paciente."
      >
        <EvolutionForm onSubmit={handleSubmit} loading={submitting} />
      </ContentModal>
    </div>
  );
}
