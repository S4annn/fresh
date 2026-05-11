import React, { useState } from 'react';
import { X, CreditCard, Wallet, QrCode, Landmark, CheckCircle2, Loader2 } from 'lucide-react';
import { createDummyCheckout, simulatePaymentSuccess } from '../services/payment';
import { PLANS } from '../services/subscription';

const paymentMethods = [
  { key: 'qris', label: 'QRIS', icon: QrCode },
  { key: 'va', label: 'Virtual Account', icon: Landmark },
  { key: 'ewallet', label: 'E-Wallet', icon: Wallet },
  { key: 'card', label: 'Credit Card', icon: CreditCard },
];

function formatPrice(value) {
  return Number(value || 0).toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });
}

export default function CheckoutModal({
  planId,
  billingCycle = 'monthly',
  role,
  onClose,
  onSuccess,
}) {
  const plan = PLANS[planId];
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [processing, setProcessing] = useState(false);

  if (!plan) return null;

  const checkout = createDummyCheckout(planId, billingCycle);

  async function handleSuccess() {
    setProcessing(true);
    window.setTimeout(() => {
      const subscription = simulatePaymentSuccess(planId, role || plan.role, billingCycle);
      setProcessing(false);
      onSuccess?.(subscription);
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Sandbox checkout</p>
            <h2 className="text-xl font-extrabold text-gray-800">{plan.plan_name}</h2>
          </div>
          <button onClick={onClose} className="btn-icon hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-gray-800">{plan.target}</p>
                <p className="mt-1 text-sm text-gray-500">Billing cycle: <span className="font-semibold text-gray-700">{billingCycle}</span></p>
              </div>
              <p className="text-right text-2xl font-black text-emerald-700">{formatPrice(checkout.amount)}</p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-gray-700">Payment method</p>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all ${
                    paymentMethod === key
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-100 bg-white text-gray-600 hover:border-emerald-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
            This is a sandbox/demo payment for MVP. Replace with Midtrans/Xendit transaction API later.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSuccess} disabled={processing} className="btn-primary flex-1 py-3">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Simulate Payment Success
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
