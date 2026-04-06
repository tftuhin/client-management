import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export interface EmailAttachment {
  filename: string
  type: string
  data: string
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(options: EmailOptions) {
  try {
    const { to, subject, html, text, from = 'onboarding@resend.dev', attachments } = options

    const emailData: any = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
    }

    if (html) {
      emailData.html = html
    }

    if (text) {
      emailData.text = text
    }

    if (attachments) {
      emailData.attachments = attachments
    }

    const result = await resend.emails.send(emailData)

    return { success: true, data: result, error: null }
  } catch (error) {
    console.error('Email sending failed:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Predefined email templates
export const emailTemplates = {
  agreementSent: (data: {
    clientName: string
    agreementTitle: string
    portalUrl: string
    expiresAt?: string
  }) => ({
    subject: `Agreement Ready for Review: ${data.agreementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Agreement Ready for Your Review</h2>
        <p>Dear ${data.clientName},</p>
        <p>An agreement has been prepared for your review:</p>
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>${data.agreementTitle}</h3>
          <p>Please review and sign the agreement at your earliest convenience.</p>
          ${data.expiresAt ? `<p><strong>Expires:</strong> ${new Date(data.expiresAt).toLocaleDateString()}</p>` : ''}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.portalUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Agreement
          </a>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Your Legal Team</p>
      </div>
    `,
    text: `
      Agreement Ready for Your Review

      Dear ${data.clientName},

      An agreement has been prepared for your review: ${data.agreementTitle}

      Please review and sign the agreement at: ${data.portalUrl}

      ${data.expiresAt ? `Expires: ${new Date(data.expiresAt).toLocaleDateString()}` : ''}

      If you have any questions, please don't hesitate to contact us.

      Best regards,
      Your Legal Team
    `
  }),

  agreementSigned: (data: {
    clientName: string
    agreementTitle: string
    signedAt: string
  }) => ({
    subject: `Agreement Signed: ${data.agreementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Agreement Successfully Signed</h2>
        <p>Dear ${data.clientName},</p>
        <p>Great news! Your agreement has been signed and is now legally binding.</p>
        <div style="background: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745;">
          <h3>${data.agreementTitle}</h3>
          <p><strong>Signed on:</strong> ${new Date(data.signedAt).toLocaleDateString()}</p>
        </div>
        <p>You will receive a copy of the signed agreement shortly.</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Your Legal Team</p>
      </div>
    `,
    text: `
      Agreement Successfully Signed

      Dear ${data.clientName},

      Great news! Your agreement "${data.agreementTitle}" has been signed and is now legally binding.

      Signed on: ${new Date(data.signedAt).toLocaleDateString()}

      You will receive a copy of the signed agreement shortly.

      Thank you for your business!

      Best regards,
      Your Legal Team
    `
  }),

  invoiceGenerated: (data: {
    clientName: string
    invoiceNumber: string
    amount: string
    dueDate: string
    portalUrl: string
  }) => ({
    subject: `Invoice Generated: ${data.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Invoice Generated</h2>
        <p>Dear ${data.clientName},</p>
        <p>A new invoice has been generated for your account.</p>
        <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h3>Invoice ${data.invoiceNumber}</h3>
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.portalUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Invoice
          </a>
        </div>
        <p>Please ensure payment is made by the due date to avoid any late fees.</p>
        <p>Best regards,<br>Your Accounting Team</p>
      </div>
    `,
    text: `
      New Invoice Generated

      Dear ${data.clientName},

      A new invoice has been generated for your account.

      Invoice: ${data.invoiceNumber}
      Amount: ${data.amount}
      Due Date: ${new Date(data.dueDate).toLocaleDateString()}

      View invoice at: ${data.portalUrl}

      Please ensure payment is made by the due date to avoid any late fees.

      Best regards,
      Your Accounting Team
    `
  }),

  offerProposed: (data: {
    clientName: string
    offerTitle: string
    portalUrl: string
  }) => ({
    subject: `New Offer Proposed: ${data.offerTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>A New Offer is Ready for You</h2>
        <p>Dear ${data.clientName},</p>
        <p>We've put together a new offer for your consideration.</p>
        <div style="background: #e9ecef; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>${data.offerTitle}</h3>
          <p>Please review the details and let us know your thoughts.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.portalUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Offer
          </a>
        </div>
        <p>If you have any questions, feel free to reply to this email or send us a message through the portal.</p>
        <p>Best regards,<br>Your Agency Team</p>
      </div>
    `,
    text: `
      A New Offer is Ready for You

      Dear ${data.clientName},

      We've put together a new offer for your consideration: ${data.offerTitle}

      Please review it at: ${data.portalUrl}

      If you have any questions, feel free to reply to this email or send us a message through the portal.

      Best regards,
      Your Agency Team
    `
  }),

  messageSent: (data: {
    clientName: string
    messageContent: string
    portalUrl: string
  }) => ({
    subject: `New Message Regarding Your Project`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You Received a New Message</h2>
        <p>Dear ${data.clientName},</p>
        <p>Our team has sent you a new message:</p>
        <div style="background: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px 20px; margin: 20px 0;">
          ${data.messageContent}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.portalUrl}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reply in Portal
          </a>
        </div>
        <p>Best regards,<br>Your Agency Team</p>
      </div>
    `,
    text: `
      You Received a New Message

      Dear ${data.clientName},

      Our team has sent you a new message:

      "${data.messageContent.replace(/<[^>]+>/g, '')}"

      View and reply at: ${data.portalUrl}

      Best regards,
      Your Agency Team
    `
  }),

  agreementChangeRequested: (data: {
    staffName: string
    clientName: string
    agreementTitle: string
    changeReason: string
    adminPortalUrl: string
  }) => ({
    subject: `Action Required: Changes Requested on Agreement`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Changes Requested</h2>
        <p>Hello ${data.staffName},</p>
        <p>The client <strong>${data.clientName}</strong> has requested changes to the following agreement:</p>
        <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h3>${data.agreementTitle}</h3>
          <p><strong>Reason:</strong></p>
          <p>${data.changeReason}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.adminPortalUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Request
          </a>
        </div>
        <p>Best regards,<br>System Notification</p>
      </div>
    `,
    text: `
      Changes Requested

      Hello ${data.staffName},

      The client ${data.clientName} has requested changes to the agreement: ${data.agreementTitle}

      Reason:
      ${data.changeReason}

      Review this request at: ${data.adminPortalUrl}

      Best regards,
      System Notification
    `
  })
}