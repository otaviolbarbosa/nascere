import BillingDashboardScreen from "@/screens/billing-dashboard-screen";
import { getBillings, getDashboardMetrics } from "@/services/billing";
import dayjs from "dayjs";

export const revalidate = 300;

export type BillingPeriod =
  | "last_week"
  | "next_week"
  | "last_month"
  | "next_month"
  | "last_quarter"
  | "next_quarter";

export function getPeriodRange(period: BillingPeriod): { startDate: string; endDate: string } {
  const fmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");
  const today = dayjs();

  switch (period) {
    case "last_week":
      return { startDate: fmt(today.subtract(1, "week")), endDate: fmt(today) };
    case "next_week":
      return { startDate: fmt(today), endDate: fmt(today.add(1, "week")) };
    case "last_month":
      return {
        startDate: fmt(today.subtract(1, "month").startOf("month")),
        endDate: fmt(today.subtract(1, "month").endOf("month")),
      };
    case "next_month":
      return {
        startDate: fmt(today.add(1, "month").startOf("month")),
        endDate: fmt(today.add(1, "month").endOf("month")),
      };
    case "last_quarter":
      return { startDate: fmt(today.subtract(3, "month")), endDate: fmt(today) };
    case "next_quarter":
      return { startDate: fmt(today), endDate: fmt(today.add(3, "month")) };
  }
}

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
