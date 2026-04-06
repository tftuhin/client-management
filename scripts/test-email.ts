// Test script for Resend email integration
import { sendEmail, emailTemplates } from '../lib/email'

async function testEmail() {
  console.log('Testing Resend email integration...')

  const result = await sendEmail({
    to: 'test@example.com', // Replace with your test email
    subject: 'Test Email from CRM System',
    html: '<h1>Test Email</h1><p>This is a test email from your CRM system.</p>',
    text: 'Test Email\n\nThis is a test email from your CRM system.',
  })

  if (result.success) {
    console.log('✅ Email sent successfully:', result.data)
  } else {
    console.error('❌ Email sending failed:', result.error)
  }
}

// Uncomment to run the test
// testEmail()

export {} // Make this a module