"use client";
import useSWR from "swr";
import Link from "next/link";
const fetcher = (url: string) => fetch(url).then((r) => r.json());
export default function DashboardPage() {
  const { data, error } = useSWR("/api/dashboard", fetcher);
  if (error) return <main className="p-8">Failed to load.</main>;
  if (!data) return <main className="p-8">Loading...</main>;
  const m = data.metrics;
  const cards = [
    { label: "Completed Services", value: m.completions },
    { label: "Requests Scheduled", value: m.scheduled },
    { label: "Requests Sent", value: m.sent },
    { label: "Failed Deliveries", value: m.failed },
  ];
  return (
    <main className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/settings" className="text-blue-600">Settings</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-gray-500 text-sm">{c.label}</p>
            <p className="text-3xl font-bold mt-2">{c.value}</p>
          </div>
        ))}
      </div>
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
      <div className="bg-white rounded-xl shadow-sm border divide-y">
        {data.recentActivity?.length ? data.recentActivity.map((a: any) => (
          <div key={a.id} className="p-4 text-sm">{a.action} — {new Date(a.createdAt).toLocaleString()}</div>
        )) : <div className="p-4 text-gray-500 text-sm">No activity yet.</div>}
      </div>
    </main>
  );
}