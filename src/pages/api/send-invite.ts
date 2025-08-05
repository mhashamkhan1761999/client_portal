// /pages/api/send-invite.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, name, link } = req.body

  if (!to || !name || !link) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Basic email format check (optional)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
  if (!isEmail) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'no-reply@metamalistic.com',
        pass: process.env.SMTP_PASS as string, // ✅ use environment variable
      },
    })

    const mailOptions = {
      from: '"MetaMalistic" <no-reply@metamalistic.com>',
      to,
      subject: '🎉 Your MetaMalistic Account Invite',
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px;">
          <h2>Hi ${name},</h2>
          <p>You've been invited to join <strong>MetaMalistic</strong> 🎨</p>
          <p>Click below to set your password and get started:</p>
          <a href="${link}" style="background-color: #c29a4b; color: black; padding: 10px 20px; border-radius: 5px; display: inline-block; text-decoration: none;">Activate Your Account</a>
          <p>If you didn’t request this, you can ignore this email.</p>
          <p>Thanks,<br/>MetaMalistic Team</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('SMTP Error:', error.message, error.stack)
    res.status(500).json({ error: 'Failed to send email', details: error.message })
  }
}
