const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration using environment variables
let transporter;

/**
 * Initialize email transporter
 * Should be called when the application starts
 */
const initializeEmailTransporter = () => {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Nodemailer response
 */
const sendEmail = async (options) => {
  if (!transporter) {
    initializeEmailTransporter();
  }

  const mailOptions = {
    from: `${process.env.APP_NAME} <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Generate verification email HTML
 * @param {string} username - User's username
 * @param {string} verificationLink - Email verification link
 * @returns {string} - HTML email content
 */
const generateVerificationEmailHTML = (username, verificationLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Verifica il tuo indirizzo email</h2>
        <p>Ciao ${username},</p>
        <p>Questo messaggio ti è stato inviato perchè stai creando un account sul 'Registro micologico di AMB Villa D'ogna'. Per favore verifica il tuo indirizzo email con il pulsante qui sotto:</p>
        <p><a href="${verificationLink}" class="button">Verifica Email</a></p>
        <p>Se il pulsante non funziona, puoi anche copiare ed incollare il seguente link nella barra indirizzi del tuo browser:</p>
        <p>${verificationLink}</p>
        <p>Questo link di verifica scadrà tra 24 ore.</p>
        <div class="footer">
          <p>Ignora questo messaggio se non stai creando un account sul 'Registro micologico di AMB Villa D'ogna'.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate password reset email HTML
 * @param {string} username - User's username
 * @param {string} resetLink - Password reset link
 * @returns {string} - HTML email content
 */
const generatePasswordResetEmailHTML = (username, resetLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { background-color: #4285F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
        .warning { color: #f44336; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Richiesta reset password per account del 'Registro micologico di AMB Villa D'ogna'</h2>
        <p>Ciao ${username},</p>
        <p>Ricevi questo messaggio perchè è pervenuta una richiesta di reset della tua password. Se effettivamente hai effettuato una richiesta, conferma con il pulsante qui sotto per creare una nuova passord:</p>
        <p><a href="${resetLink}" class="button">Reset Password</a></p>
        <p>Se il pulsante non funziona, puoi anche copiare ed incollare il seguente link nella barra indirizzi del tuo browser:</p>
        <p>${resetLink}</p>
        <p class="warning">Questo link per il reset della password scadrà tra 1 ora.</p>
        <div class="footer">
          <p>Ignora questo messaggio se non hai effettuato una richiesta di reset password. Il tuo account rimarrà sicuro.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  initializeEmailTransporter,
  sendEmail,
  generateVerificationEmailHTML,
  generatePasswordResetEmailHTML
};

/*
 * OAUTH2 utils


const initializeEmailTransporter = () => {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN
      // let nodemailer handle access token refresh automatically
      // accessToken: process.env.ACCESS_TOKEN
    }
  });
  testGmailAuth();

};

const initializeEmailTransporter = () => {
  console.log('Initializing email transporter...');

  // Validate environment variables
  const requiredVars = ['EMAIL_USER', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      // Don't set accessToken - let nodemailer generate it
    },
    debug: true, // Enable debug mode
    logger: true // Enable logging
  });

console.log('Email transporter initialized');
  // testGmailAuth();

};


  * Test Gmail OAuth2 configuration
  * This function checks if the transporter is initialized and verifies the connection.
  * It also sends a test email to the configured email address.

const testGmailAuth = async () => {
  console.log('Testing Gmail OAuth2 configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('CLIENT_ID:', process.env.CLIENT_ID ? 'Set' : 'Missing');
  console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? 'Set' : 'Missing');
  console.log('REFRESH_TOKEN:', process.env.REFRESH_TOKEN ? 'Set (length: ' + process.env.REFRESH_TOKEN.length + ')' : 'Missing');

  try {
    if (!transporter) {
      initializeEmailTransporter();
    }

    // Test the connection
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully');

    // Send a test email to yourself
    const testResult = await transporter.sendMail({
      from: `Test <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'OAuth2 Test Email',
      html: '<p>This is a test email to verify OAuth2 setup.</p>'
    });

    console.log('✅ Test email sent successfully:', testResult.messageId);

  } catch (error) {
    console.error('❌ Gmail test failed:', error.message);
    console.error('Full error:', error);
  }
};
*/