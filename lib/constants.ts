import type { PipelineStage, AgreementStatus, InvoiceStatus, OfferStatus } from "@/types/database";

export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "bg-slate-100 text-slate-700" },
  { value: "prospect", label: "Prospect", color: "bg-blue-100 text-blue-700" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-yellow-100 text-yellow-700" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-100 text-orange-700" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-700" },
  { value: "on_hold", label: "On Hold", color: "bg-purple-100 text-purple-700" },
  { value: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  { value: "churned", label: "Churned", color: "bg-red-100 text-red-700" },
];

export const AGREEMENT_STATUSES: { value: AgreementStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "sent", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "viewed", label: "Viewed", color: "bg-yellow-100 text-yellow-700" },
  { value: "signed", label: "Signed", color: "bg-green-100 text-green-700" },
  { value: "expired", label: "Expired", color: "bg-orange-100 text-orange-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "sent", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "viewed", label: "Viewed", color: "bg-cyan-100 text-cyan-700" },
  { value: "partially_paid", label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-700" },
  { value: "overdue", label: "Overdue", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-slate-100 text-slate-500" },
];

export const OFFER_STATUSES: { value: OfferStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "proposed", label: "Proposed", color: "bg-blue-100 text-blue-700" },
  { value: "accepted", label: "Accepted", color: "bg-green-100 text-green-700" },
  { value: "declined", label: "Declined", color: "bg-red-100 text-red-700" },
];

export const SERVICE_TYPES = [
  "Website Design",
  "Web Development",
  "E-commerce",
  "Web App",
  "Mobile App",
  "SEO",
  "Maintenance & Support",
  "Redesign",
  "Branding",
  "Content Management",
  "Performance Optimization",
  "Security Audit",
  "API Integration",
  "Other",
];

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Education",
  "Real Estate",
  "Manufacturing",
  "Media & Entertainment",
  "Non-profit",
  "Government",
  "Food & Beverage",
  "Travel & Hospitality",
  "Legal",
  "Consulting",
  "Other",
];

export const LEAD_SOURCES = [
  "Referral",
  "Website",
  "Cold Outreach",
  "Social Media",
  "Conference/Event",
  "Advertisement",
  "Partner",
  "Existing Client",
  "Other",
];

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "SGD", "AED"];

export const PROJECT_TYPES = [
  "Website",
  "E-commerce",
  "Web App",
  "Mobile App",
  "Landing Page",
  "Blog/CMS",
  "Portfolio",
  "Custom",
];
