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
        pass: process.env.SMTP_PASS!,
      },
    })

    const mailOptions = {
      from: '"MetaMalistic" <no-reply@metamalistic.com>',
      to,
      subject: '🎉 You’re Invited to MetaMalistic!',
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px; max-width: 600px;">
          <h2>Hi ${name},</h2>
          <p>You've been invited to join <strong>MetaMalistic</strong> 🎨</p>
          <p>Please click the button below to activate your account and set your password:</p>
          <p style="text-align: center;">
            <a href="${link}" style="background-color: #c29a4b; color: black; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Activate Your Account
            </a>
          </p>
          <p>If you didn’t request this invite, please ignore this email.</p>
          <p>Thanks,<br/>The MetaMalistic Team</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('[SMTP ERROR]', error.message)
    return res.status(500).json({ error: 'Failed to send invite email', details: error.message })
  }
}
