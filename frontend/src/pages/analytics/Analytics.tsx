import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
  CalendarDays,
  Activity,
} from "lucide-react";

import {
  getAnalyticsSummary,
  getWeeklyAnalytics,
  getTopDiseases,
  getMonthlyPatients,
} from "../../services/patientApi";

import type {
  AnalyticsSummary,
  WeeklyAnalytics,
  TopDisease,
  MonthlyPatient,
} from "../../services/patientApi";

import SummaryCard from "../../components/analytics/SummaryCard";
import WeeklyPatientsChart from "../../components/analytics/WeeklyPatientsChart";
import GenderPieChart from "../../components/analytics/GenderPieChart";
import TopDiseasesChart from "../../components/analytics/TopDiseasesChart";
import MonthlyPatientsChart from "../../components/analytics/MonthlyPatientsChart";

export default function Analytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalytics[]>([]);
  const [topDiseases, setTopDiseases] = useState<TopDisease[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPatient[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        summaryData,
        weekly,
        diseases,
        monthly,
      ] = await Promise.all([
        getAnalyticsSummary(),
        getWeeklyAnalytics(),
        getTopDiseases(),
        getMonthlyPatients(),
      ]);

      setSummary(summaryData);
      setWeeklyData(weekly);
      setTopDiseases(diseases);
      setMonthlyData(monthly);
    } catch (err) {
      console.error("Failed to load analytics:", err);

      setError(
        "Unable to load analytics data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-28 rounded-2xl bg-white shadow-sm" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[390px] rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <ShieldAlert className="h-7 w-7 text-red-600" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-slate-900">
              Analytics unavailable
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchAnalytics()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const hasAnyAnalyticsData =
    summary.totalPatients > 0 ||
    weeklyData.some((item) => item.patients > 0) ||
    topDiseases.length > 0 ||
    monthlyData.some((item) => item.patients > 0);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Hospital Analytics
                  </h1>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Overview
                  </span>
                </div>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                  Monitor patient registrations, demographics, disease
                  distribution, and registration trends.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* =========================================================
            REFRESH ERROR
        ========================================================= */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Unable to refresh analytics
              </p>

              <p className="mt-0.5 text-xs leading-5 text-amber-700">
                Existing dashboard data is still displayed. Please try
                refreshing again.
              </p>
            </div>
          </div>
        )}

        {/* =========================================================
            KPI CARDS
        ========================================================= */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />

            <h2 className="text-sm font-semibold text-slate-700">
              Patient Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Patients"
              value={summary.totalPatients}
              color="blue"
            />

            <SummaryCard
              title="Today's Patients"
              value={summary.todayPatients}
              color="green"
            />

            <SummaryCard
              title="Male Patients"
              value={summary.malePatients}
              color="purple"
            />

            <SummaryCard
              title="Female Patients"
              value={summary.femalePatients}
              color="pink"
            />
          </div>
        </section>

        {/* =========================================================
            DATA AVAILABILITY
        ========================================================= */}
        {!hasAnyAnalyticsData && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-800">
              No analytics data yet
            </h2>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              Patient registration activity will appear here once data is
              available.
            </p>
          </div>
        )}

        {/* =========================================================
            CHARTS
        ========================================================= */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />

            <h2 className="text-sm font-semibold text-slate-700">
              Patient Insights
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <WeeklyPatientsChart data={weeklyData} />

            <MonthlyPatientsChart data={monthlyData} />

            <TopDiseasesChart data={topDiseases} />

            <GenderPieChart
              male={summary.malePatients}
              female={summary.femalePatients}
            />
          </div>
        </section>

        {/* =========================================================
            FOOTER CONTEXT
        ========================================================= */}
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Analytics based on available patient records.</span>
          </div>

          <span>Data updates when the dashboard is refreshed.</span>
        </div>
      </div>
    </div>
  );
}