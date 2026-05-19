import { PLANS, upgradePlan } from './subscription';
import { upgradeSubscription } from '../api';

export function createDummyCheckout(planId, billingCycle = 'monthly') {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Unknown plan');

  const amount = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
  return {
    id: `dummy_checkout_${Date.now()}`,
    plan_id: planId,
    plan_name: plan.plan_name,
    billing_cycle: billingCycle,
    amount,
    currency: 'IDR',
    status: 'pending',
    payment_methods: ['QRIS', 'Virtual Account', 'E-Wallet', 'Credit Card'],
    sandbox: true,
  };
}

export async function simulatePaymentSuccess(planId, role, billingCycle = 'monthly') {
  try {
    const result = await upgradeSubscription(planId, role || PLANS[planId]?.role, billingCycle);
    if (result?.receipt_email_sent) {
      console.log('[Payment] Receipt email sent successfully.');
    } else if (result?.receipt_email_sent === false) {
      console.warn('[Payment] Upgrade succeeded but receipt email was not sent.');
    }
    return result;
  } catch (err) {
    console.error('[Payment] Backend upgrade failed, using local fallback:', err?.message || err);
    return upgradePlan(planId, role || PLANS[planId]?.role, billingCycle);
  }
}

export async function createPaymentSession(planId, billingCycle = 'monthly') {
  // Replace dummy checkout with Midtrans/Xendit transaction API later.
  return createDummyCheckout(planId, billingCycle);
}

export async function handlePaymentCallback(payload) {
  // Placeholder for Midtrans/Xendit webhook/callback reconciliation later.
  return {
    ok: true,
    received: payload,
  };
}
