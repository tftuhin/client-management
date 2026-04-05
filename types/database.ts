// Auto-generate this file by running: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
// Placeholder types — replace with generated types after connecting to Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PipelineStage =
  | "lead"
  | "prospect"
  | "proposal_sent"
  | "negotiation"
  | "active"
  | "on_hold"
  | "completed"
  | "churned";

export type AgreementStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "expired"
  | "cancelled";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type MessageType = "internal_note" | "client_message" | "system_event";

export type OfferStatus = "draft" | "proposed" | "accepted" | "declined";

export type DocumentType =
  | "project_brief"
  | "requirements"
  | "contract"
  | "invoice_attachment"
  | "design_asset"
  | "other";

export interface Database {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          role: "owner" | "admin" | "member";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["staff"]["Row"],
          "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["staff"]["Insert"]>;
      };
      clients: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string | null;
          website_url: string | null;
          industry: string | null;
          company_size: string | null;
          annual_revenue: string | null;
          country: string | null;
          address: string | null;
          pipeline_stage: PipelineStage;
          pipeline_order: number;
          assigned_to: string | null;
          lead_source: string | null;
          tags: string[];
          notes: string | null;
          avatar_url: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["clients"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      project_requirements: {
        Row: {
          id: string;
          client_id: string;
          project_name: string;
          project_type: string | null;
          description: string | null;
          budget_min: number | null;
          budget_max: number | null;
          timeline_weeks: number | null;
          deadline: string | null;
          tech_preferences: string[];
          priority_features: string[];
          competitors: string[];
          target_audience: string | null;
          special_notes: string | null;
          is_current: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["project_requirements"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["project_requirements"]["Insert"]
        >;
      };
      agreements: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          content: string;
          status: AgreementStatus;
          template_used: string | null;
          sent_at: string | null;
          sent_by: string | null;
          viewed_at: string | null;
          signed_at: string | null;
          client_signature_name: string | null;
          firm_signed_at: string | null;
          firm_signer: string | null;
          expires_at: string | null;
          pdf_storage_path: string | null;
          version: number;
          parent_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["agreements"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["agreements"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          client_id: string;
          invoice_number: string;
          title: string;
          status: InvoiceStatus;
          currency: string;
          subtotal: number;
          discount_pct: number;
          discount_flat: number;
          tax_pct: number;
          tax_amount: number;
          total: number;
          amount_paid: number;
          issue_date: string;
          due_date: string;
          sent_at: string | null;
          paid_at: string | null;
          notes: string | null;
          payment_terms: string | null;
          pdf_storage_path: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invoices"]["Row"],
          | "id"
          | "invoice_number"
          | "tax_amount"
          | "total"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          amount: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invoice_line_items"]["Row"],
          "id" | "amount" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["invoice_line_items"]["Insert"]
        >;
      };
      invoice_payments: {
        Row: {
          id: string;
          invoice_id: string;
          amount: number;
          paid_at: string;
          method: string | null;
          reference: string | null;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invoice_payments"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["invoice_payments"]["Insert"]
        >;
      };
      documents: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          document_type: DocumentType;
          description: string | null;
          storage_path: string;
          file_size: number | null;
          mime_type: string | null;
          is_shared_with_client: boolean;
          shared_at: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["documents"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          client_id: string;
          message_type: MessageType;
          content: string;
          is_pinned: boolean;
          linked_entity_type: string | null;
          linked_entity_id: string | null;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["messages"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };      activity_log: {
        Row: {
          id: string;
          client_id: string | null;
          actor_id: string | null;
          event_type: string;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["activity_log"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Insert"]>;
      };
      next_offers: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          service_type: string;
          description: string | null;
          estimated_value: number | null;
          status: OfferStatus;
          proposed_at: string | null;
          responded_at: string | null;
          follow_up_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["next_offers"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["next_offers"]["Insert"]>;
      };
      agreement_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          content: string;
          is_default: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["agreement_templates"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["agreement_templates"]["Insert"]
        >;
      };
      firm_settings: {
        Row: {
          id: string;
          firm_name: string;
          firm_logo_url: string | null;
          firm_address: string | null;
          firm_email: string | null;
          firm_phone: string | null;
          invoice_prefix: string;
          invoice_next_num: number;
          default_currency: string;
          default_tax_pct: number;
          default_payment_terms: string | null;
          invoice_footer: string | null;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["firm_settings"]["Row"],
          "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["firm_settings"]["Insert"]>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      pipeline_stage: PipelineStage;
      agreement_status: AgreementStatus;
      invoice_status: InvoiceStatus;
      message_type: MessageType;
      offer_status: OfferStatus;
      document_type: DocumentType;
    };
  };
}
