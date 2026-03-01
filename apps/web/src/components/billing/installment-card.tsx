"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/billing/calculations";
import { dayjs } from "@/lib/dayjs";
import type { Tables } from "@nascere/supabase/types";
import Link from "next/link";
import { PaymentMethodBadge } from "./payment-method-badge";
import { StatusBadge } from "./status-badge";

type Installment = Tables<"installments"> & {
  description: string;
  patient_name: string;
  patient_id: string;
};

export function InstallmentCard({
  installment,
  installmentCount,
}: { installment: Installment; installmentCount: number }) {
  return (
    <Link
      href={`/patients/${installment.patient_id}/billing/${installment.billing_id}`}
      className="block"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium">{installment.description}</h3>
              <p className="text-muted-foreground text-sm">{installment.patient_name}</p>
            </div>
            <StatusBadge status={installment.status} />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div>
              <span className="font-semibold text-lg">{formatCurrency(installment.amount)}</span>
              {installmentCount > 1 && (
                <span className="ml-2 whitespace-nowrap text-muted-foreground">
                  {installment.installment_number} de {installmentCount} parcelas
                </span>
              )}
            </div>

            <PaymentMethodBadge method={installment.payment_method} />
          </div>
          <div className="text-muted-foreground text-xs">
            Venc.: {dayjs(installment.due_date).format("DD/MM/YYYY")}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
