"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Filter } from "lucide-react";
import { DEFAULT_WORKFLOW, DEFAULT_WORKFLOW_ID } from "@/lib/workflow/templates";
import { useAuthStore } from "@/lib/store/auth-store";

export default function DashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [joined, setJoined] = useState(false);
  const { setIdentity } = useAuthStore();

  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-80 rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Enter your name</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (displayName.trim()) {
                setIdentity(displayName.trim());
                setJoined(true);
              }
            }}
          >
            <input
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!displayName.trim()}
            >
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap size={16} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Workflow Builder</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Build event-driven workflows for Stacks blockchain
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-8 py-8">
        <h2 className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
          Workflows
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            onClick={() => router.push(`/workflow/${DEFAULT_WORKFLOW_ID}`)}
            className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <Filter size={20} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">{DEFAULT_WORKFLOW.name}</h3>
              <p className="mt-1 text-xs text-gray-500">{DEFAULT_WORKFLOW.description}</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
