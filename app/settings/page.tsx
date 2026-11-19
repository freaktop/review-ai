"use client";
import { useEffect, useState } from "react";
export default function SettingsPage() {
  const [form, setForm] = useState<any>({}); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState<string|null>(null);
  useEffect(() => { fetch("/api/settings").then((r)=>r.json()).then((d)=>{ setForm(d.business||{}); setLoading(false); }); }, []);
  async function onSubmit(e: React.FormEvent) { e.preventDefault(); setSaving(true); setMsg(null); const res = await fetch("/api/settings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: form.name, reviewUrl: form.reviewUrl, delayHours: form.delayHours, enabled: form.enabled }) }); setSaving(false); setMsg(res.ok?"Saved.":"Save failed."); }
  if (loading) return <main className="p-8">Loading...</main>;
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <form onSubmit={onSubmit} className="space-y-4 bg-white p-8 rounded-xl shadow-sm border">
        <label className="block"><span className="text-sm text-gray-600">Business name</span><input className="w-full border p-2 rounded mt-1" value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></label>
        <label className="block"><span className="text-sm text-gray-600">Review destination URL</span><input className="w-full border p-2 rounded mt-1" value={form.reviewUrl||""} onChange={(e)=>setForm({...form,reviewUrl:e.target.value})} /></label>
        <label className="block"><span className="text-sm text-gray-600">Delay before sending (hours)</span><input type="number" className="w-full border p-2 rounded mt-1" value={form.delayHours??24} onChange={(e)=>setForm({...form,delayHours:Number(e.target.value)})} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.enabled??true} onChange={(e)=>setForm({...form,enabled:e.target.checked})} /><span className="text-sm text-gray-600">Enabled</span></label>
        <button disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded font-semibold">{saving?"Saving...":"Save"}</button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </form>
    </main>
  );
}