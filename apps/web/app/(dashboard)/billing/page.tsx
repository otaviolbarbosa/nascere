import { type BillingPeriod, getPeriodRange } from "@/lib/billing/period-range";
import BillingDashboardScreen from "@/screens/billing-dashboard-screen";
import { getBillings, getDashboardMetrics } from "@/services/billing";

export const revalidate = 300;

export default async function BillingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;

  const activePeriod = period as BillingPeriod | undefined;
  const dateRange = activePeriod ? getPeriodRange(activePeriod) : undefined;

  const [{ billings }, { metrics }] = await Promise.all([
    getBillings(dateRange?.startDate, dateRange?.endDate),
    getDashboardMetrics(dateRange?.startDate, dateRange?.endDate),
  ]);

  return (
    <BillingDashboardScreen
      billings={billings}
      metrics={metrics}
      activePeriod={activePeriod ?? null}
    />
  );
}
