'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessions, kb } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        kb.stats(),
        sessions.list(),
      ]);
      setStats(statsRes.data.stats);
      setSessionsList(sessionsRes.data.sessions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = async () => {
    try {
      const res = await sessions.create();
      router.push(`/interview/${res.data.session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Voice KB Interview Agent
          </h1>
          <p className="text-gray-600">
            Build your knowledge base through voice conversations
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Timeline Entries" value={stats.timeline} />
            <StatCard label="Skills" value={stats.skills} />
            <StatCard label="Facts" value={stats.facts} />
            <StatCard label="Open Questions" value={stats.openQuestions} />
          </div>
        )}

        {/* Start New Session */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Start New Interview</h2>
          <p className="text-gray-600 mb-4">
            Begin a voice interview session to add more information to your knowledge base.
          </p>
          <button
            onClick={startNewSession}
            className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            🎤 Start New Session
          </button>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Recent Sessions</h2>
          {sessionsList.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No sessions yet. Start your first interview!</p>
          ) : (
            <div className="space-y-3">
              {sessionsList.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/interview/${session.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{session.module || 'Unknown Module'}</p>
                      <p className="text-sm text-gray-500">{session.turnCount} turns</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        session.status === 'active' ? 'bg-green-100 text-green-800' :
                        session.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(session.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <p className="text-3xl font-bold text-primary-600">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
}
