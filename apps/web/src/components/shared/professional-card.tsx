"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnterpriseProfessional } from "@/services/professional";
import { getInitials } from "@/utils";
import { Mail, MoreHorizontal, Phone, Stethoscope, UserMinus } from "lucide-react";
import Link from "next/link";

const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  obstetra: "Obstetra",
  enfermeiro: "Enfermeira",
  doula: "Doula",
};

type ProfessionalCardProps = {
  professional: EnterpriseProfessional;
  onRemove: (professional: EnterpriseProfessional) => void;
};

export function ProfessionalCard({ professional, onRemove }: ProfessionalCardProps) {
  const typeLabel = professional.professional_type
    ? (PROFESSIONAL_TYPE_LABELS[professional.professional_type] ?? professional.professional_type)
    : null;

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="relative flex justify-between bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-16 w-16 shadow-md ring-4 ring-background">
            <AvatarImage
              src={professional.avatar_url || undefined}
              alt={professional.name || ""}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 font-semibold text-lg text-primary">
              {getInitials(professional.name ?? "")}
            </AvatarFallback>
          </Avatar>
          {/* Name & type */}
          <div>
            <p className="font-bold text-lg leading-tight">{professional.name ?? "—"}</p>
            {typeLabel && <p className="mt-0.5 text-muted-foreground text-sm">{typeLabel}</p>}
          </div>
        </div>

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl bg-background shadow-sm"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemove(professional)}
              >
                <UserMinus className="mr-2 size-4" />
                Remover da organização
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between gap-4 px-4 pt-3 pb-4">
        {/* Contact rows */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-sm">
              <Phone className="size-3.5" />
              {/* <span>Telefone:</span> */}
            </div>
            <span className="font-medium text-sm">{professional.phone ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-sm">
              <Mail className="size-3.5" />
              {/* <span>Email:</span> */}
            </div>
            <span className="truncate font-medium text-sm">{professional.email ?? "—"}</span>
          </div>
        </div>

        {/* Patients link */}
        <Link
          href={`/patients?professional=${professional.id}`}
          className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2.5"
        >
          <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 font-medium text-sm hover:text-primary hover:underline">
            {professional.patient_count}{" "}
            {professional.patient_count === 1 ? "gestante" : "gestantes"}
          </div>
          <Badge variant="secondary" className="text-xs">
            Ver
          </Badge>
        </Link>
      </div>
    </Card>
  );
}
