import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePdf, type InvoicePdfData } from '@/lib/pdf'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  const supabase = await createClient()

  // Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Fetch invoice, line items, and client info
  const [{ data: invoice }, { data: lineItems }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(id, company_name, address)')
      .eq('id', invoiceId)
      .single(),
    supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order')
  ])

  if (!invoice) {
    return new NextResponse('Invoice not found', { status: 404 })
  }

  // Authorization: user must be staff or the matched client
  const userType = user.user_metadata?.user_type
  if (userType === 'client' && user.user_metadata?.client_id !== invoice.client_id) {
    return new NextResponse('Unauthorized access to this invoice', { status: 403 })
  }

  const client = invoice.clients as any
  
  const formattedIssueDate = new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
  const formattedDueDate = new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')

  const invoiceData: InvoicePdfData = {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: formattedIssueDate,
    dueDate: formattedDueDate,
    clientName: client?.company_name || 'Client',
    clientAddress: client?.address || undefined,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxPct: invoice.tax_pct,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    paymentTerms: invoice.payment_terms || undefined,
    notes: invoice.notes || undefined,
    lineItems: (lineItems || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount
    }))
  }

  try {
    const pdfBuffer = await generateInvoicePdf(invoiceData)

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
