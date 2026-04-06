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
