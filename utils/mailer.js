const sendOtpEmail = async (toEmail, otp) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Task Manager',
        email: process.env.EMAIL_USER,
      },
      to: [
        {
          email: toEmail,
        },
      ],
      subject: 'Your verification code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Task Manager</h2>
          <p>Your verification code is:</p>
          <h1>${otp}</h1>
          <p>This code expires in 5 minutes.</p>
          <p>If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Brevo email error:', response.status, errorText);
    throw new Error('Failed to send verification email.');
  }
};

module.exports = sendOtpEmail;