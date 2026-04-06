import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface AgreementPdfData {
  title: string
  clientName: string
  content: string
  version: number
  signedAt: string | null
  firmSignedAt: string | null
  clientSignatureName: string | null
  firmSigner: string | null
}

export async function generateAgreementPdf(data: AgreementPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595, 842])
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const margin = 48
  let y = 842 - margin

  const drawText = (text: string, size = 12, color = rgb(0, 0, 0)) => {
    const lines = text.split('\n')
    for (const line of lines) {
      if (y < margin + 30) {
        page = pdfDoc.addPage([595, 842])
        y = 842 - margin
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: timesRomanFont,
        color,
      })
      y -= size + 6
    }
  }

  drawText(data.title, 18)
  y -= 8
  drawText(`Client: ${data.clientName}`, 12)
  drawText(`Version: ${data.version}`, 12)
  if (data.signedAt) drawText(`Client signed: ${new Date(data.signedAt).toLocaleString()}`, 12)
  if (data.clientSignatureName) drawText(`Client signature name: ${data.clientSignatureName}`, 12)
  if (data.firmSignedAt) drawText(`Firm signed: ${new Date(data.firmSignedAt).toLocaleString()}`, 12)
  if (data.firmSigner) drawText(`Firm signer: ${data.firmSigner}`, 12)
  y -= 12
  drawText('Agreement content:', 14)
  y -= 6

  const contentLines = data.content.split('\n')
  for (const line of contentLines) {
    if (y < margin + 30) {
      page = pdfDoc.addPage([595, 842])
      y = 842 - margin
    }
    const wrapped = line.match(/.{1,85}(?:\s|$)/g) || [line]
    for (const wrappedLine of wrapped) {
      page.drawText(wrappedLine, {
        x: margin,
        y,
        size: 11,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })
      y -= 14
      if (y < margin + 30) {
        page = pdfDoc.addPage([595, 842])
        y = 842 - margin
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export interface InvoiceLineItemPdf {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface InvoicePdfData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  clientName: string
  clientAddress?: string
  currency: string
  lineItems: InvoiceLineItemPdf[]
  subtotal: number
  taxPct: number
  taxAmount: number
  total: number
  paymentTerms?: string
  notes?: string
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const margin = 50
  const width = 595
  const rightMargin = width - margin
  let y = 842 - 50

  const drawText = (text: string, x: number, lineY: number, font: any, size: number, align: 'left' | 'right' = 'left') => {
    const textWidth = font.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: align === 'right' ? x - textWidth : x,
      y: lineY,
      size,
      font,
      color: rgb(0, 0, 0),
    })
  }

  // Header -> "Invoice"
  drawText('Invoice', rightMargin, y, helveticaBold, 24, 'right')
  y -= 40

  // Invoice Details
  drawText('Invoice Date:', rightMargin - 100, y, helveticaBold, 10, 'right')
  drawText(data.invoiceDate, rightMargin, y, helveticaFont, 10, 'right')
  y -= 15
  drawText('Invoice Number:', rightMargin - 100, y, helveticaBold, 10, 'right')
  drawText(data.invoiceNumber, rightMargin, y, helveticaFont, 10, 'right')
  y -= 40

  // To / From
  const toFromY = y
  drawText('Invoice to:', margin, y, helveticaBold, 10)
  drawText('Invoice from:', rightMargin, y, helveticaBold, 10, 'right')
  y -= 15

  // To data
  drawText(data.clientName, margin, y, helveticaBold, 10)
  if (data.clientAddress) {
    y -= 15
    drawText(data.clientAddress, margin, y, helveticaFont, 10)
  }

  // From data
  let fromY = toFromY - 15
  drawText('Themefisher', rightMargin, fromY, helveticaBold, 10, 'right')
  fromY -= 15
  drawText('Appartement A2, House-2G,', rightMargin, fromY, helveticaFont, 10, 'right')
  fromY -= 15
  drawText('Shaymoly, Road-1, Dhaka', rightMargin, fromY, helveticaFont, 10, 'right')
  fromY -= 15
  drawText('Bangladesh', rightMargin, fromY, helveticaFont, 10, 'right')
  fromY -= 20
  drawText('BIN: 003271347', rightMargin, fromY, helveticaFont, 10, 'right')

  y = Math.min(y - 20, fromY - 40)

  // Separator
  page.drawLine({ start: { x: margin, y }, end: { x: rightMargin, y }, thickness: 1 })
  y -= 15

  // Currency
  drawText('CURRENCY-', margin, y, helveticaBold, 10)
  drawText(data.currency.toUpperCase(), margin + 80, y, helveticaBold, 10)
  y -= 10
  page.drawLine({ start: { x: margin, y }, end: { x: rightMargin, y }, thickness: 1 })
  y -= 25

  // Order details
  drawText('Order details:', margin, y, helveticaBold, 10)
  y -= 15
  if (data.lineItems.length > 0) {
    drawText('Product:', margin, y, helveticaFont, 10)
    const productDesc = data.lineItems.map(i => i.description).join(', ')
    drawText(productDesc, margin + 80, y, helveticaBold, 10)
  }
  y -= 20
  page.drawLine({ start: { x: margin, y }, end: { x: rightMargin, y }, thickness: 1 })
  y -= 25

  // Billing summary
  drawText('Billing summary:', margin, y, helveticaBold, 10)
  y -= 20
  
  // Due date period (Sales Period)
  drawText('Sales Period', margin + 25, y, helveticaBold, 10)
  drawText(`${data.invoiceDate}  -  ${data.dueDate}`, rightMargin, y, helveticaFont, 10, 'right')
  y -= 15

  // Amount Due (Subtotal)
  drawText('Amount Due', margin + 25, y, helveticaBold, 10)
  drawText(data.subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","), rightMargin, y, helveticaFont, 10, 'right')
  y -= 15

  // Sales Tax amount
  drawText('Sales Tax', margin + 25, y, helveticaBold, 10)
  drawText(data.taxAmount.toFixed(2), rightMargin, y, helveticaFont, 10, 'right')
  y -= 15

  // Sales Tax: %
  drawText('Sales Tax: %', margin + 25, y, helveticaBold, 10)
  drawText(`${data.taxPct.toFixed(2)}%`, rightMargin, y, helveticaFont, 10, 'right')
  y -= 10

  page.drawLine({ start: { x: rightMargin - 150, y }, end: { x: rightMargin, y }, thickness: 1 })
  y -= 15

  // Total Amount Due
  drawText('Total Amount Due', margin + 25, y, helveticaBold, 10)
  drawText(data.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","), rightMargin, y, helveticaBold, 10, 'right')
  y -= 30

  // Payment terms
  if (data.paymentTerms) {
    drawText('Payment terms', margin + 25, y, helveticaBold, 10)
    drawText(data.paymentTerms, rightMargin, y, helveticaFont, 10, 'right')
    y -= 20
  }

  page.drawLine({ start: { x: margin, y }, end: { x: rightMargin, y }, thickness: 1 })
  y -= 25

  // Transfer Information
  drawText('Transfer Information:', margin, y, helveticaBold, 10)
  y -= 10

  const boxTop = y
  
  y -= 20
  drawText('Bank Name:', margin + 15, y, helveticaBold, 10)
  y -= 15
  drawText('Standard Chartered bank', margin + 15, y, helveticaFont, 10)
  y -= 20

  drawText('Bank Address:', margin + 15, y, helveticaBold, 10)
  y -= 15
  drawText('67 Gulshan Avenue, Gulshan, Dhaka 1212, Bangladesh', margin + 15, y, helveticaFont, 10)
  y -= 20

  drawText('Name on Account:', margin + 15, y, helveticaBold, 10)
  y -= 15
  drawText('Themefisher', margin + 15, y, helveticaFont, 10)
  y -= 20

  drawText('Special Instructions/ Notes:', margin + 15, y, helveticaBold, 10)
  y -= 15
  drawText(data.notes || '-', margin + 15, y, helveticaFont, 10)
  y -= 20

  drawText('BIC/SWIFT:', margin + 15, y, helveticaBold, 10)
  y -= 15
  drawText('SCBLBDDXXXX', margin + 15, y, helveticaFont, 10)
  y -= 20

  drawText('IBAN/Account Number:', margin + 15, y, helveticaBold, 10)
  y -= 15
  drawText('01914137101', margin + 15, y, helveticaFont, 10)
  y -= 20

  page.drawRectangle({
    x: margin,
    y: y,
    width: rightMargin - margin,
    height: boxTop - y,
    borderWidth: 1,
    borderColor: rgb(0.8, 0.8, 0.8),
  })

  const invoicePdfBytes = await pdfDoc.save()
  return Buffer.from(invoicePdfBytes)
}
