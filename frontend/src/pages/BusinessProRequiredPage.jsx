import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Crown } from 'lucide-react';
import { useSubscription } from '../services/subscription';

export default function BusinessProRequiredPage() {
  const navigate = useNavigate();
  const { plan } = useSubscription();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
          <Building2 className="h-8 w-8" />
        </div>
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
          <Crown className="h-3.5 w-3.5" /> Business Pro Required
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900">Business Pro Required</h1>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">
          This feature is designed for restaurants, hotels, cafes, and food businesses.
          Your current plan is <span className="font-bold text-gray-800">{plan.plan_name}</span>.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/pricing" className="btn-primary no-underline">
            Upgrade to Business Pro
          </Link>
          <button onClick={() => navigate('/business/dashboard')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
