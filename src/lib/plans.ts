// Single source of truth for Hormulse AI plan tiers.
// Mirror in supabase/functions/chat/index.ts (kept in sync manually).

export type PlanId = "free" | "lite" | "pro" | "pro_plus";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number; // BDT / month
  tagline: string;
  dailyMessages: number; // Infinity = unlimited
  models: string[]; // human labels
  features: string[];
  limits: { uploads: boolean; history: boolean; imageGen: boolean; priority: boolean };
  cta: string;
  highlight?: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Try the full Hormulse experience",
    dailyMessages: 15,
    models: ["Groq Llama 3.3"],
    features: [
      "15 messages / day",
      "Hormone, sleep, nutrition Q&A",
      "Daily plan + tracking",
      "No image uploads",
      "Chat history not saved",
    ],
    limits: { uploads: false, history: false, imageGen: false, priority: false },
    cta: "Start free",
  },
  lite: {
    id: "lite",
    name: "Lite",
    price: 99,
    tagline: "Cheaper than lunch",
    dailyMessages: 100,
    models: ["Groq Llama 3.3", "DeepSeek Chat"],
    features: [
      "100 messages / day",
      "Image & lab-report uploads",
      "Saved chat history",
      "DeepSeek + Groq routing",
      "Priority over free queue",
    ],
    limits: { uploads: true, history: true, imageGen: false, priority: false },
    cta: "Upgrade to Lite",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 199,
    tagline: "Most popular — 0.57% of a junior dev salary",
    dailyMessages: Infinity,
    models: ["Gemini 2.5", "Claude 3.5", "DeepSeek", "Groq"],
    features: [
      "Unlimited messages",
      "All models (Gemini, Claude, DeepSeek, Groq)",
      "AI image generation",
      "Web search & personal context",
      "Priority response queue",
    ],
    limits: { uploads: true, history: true, imageGen: true, priority: true },
    cta: "Upgrade to Pro",
    highlight: true,
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+",
    price: 399,
    tagline: "For power users and small teams",
    dailyMessages: Infinity,
    models: ["Gemini 2.5 Pro", "Claude Opus", "DeepSeek", "Groq"],
    features: [
      "Everything in Pro",
      "Claude Opus & Gemini 2.5 Pro",
      "Longer context (full session memory)",
      "Early access to new features",
      "Email support within 12h",
    ],
    limits: { uploads: true, history: true, imageGen: true, priority: true },
    cta: "Upgrade to Pro+",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "lite", "pro", "pro_plus"];

export const BKASH = {
  merchant: "01700-000000", // TODO: replace with real merchant number in admin settings
  type: "Merchant",
  reference: (uid: string) => `HRM-${uid.slice(0, 6).toUpperCase()}`,
};

export const formatBDT = (n: number) =>
  n === 0 ? "Free" : `৳${n.toLocaleString("en-BD")}`;
