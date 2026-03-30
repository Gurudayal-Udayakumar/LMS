const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

if (config.smtp.enabled && config.smtp.user && config.smtp.pass) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`[Email Disabled] To: ${to} | Subject: ${subject}`);
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    console.log(`[Email Sent] To: ${to} | MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email Error] To: ${to} | Error: ${err.message}`);
    return null;
  }
};

const emailTemplates = {
  appointmentBooked: (appointment, mentor) => ({
    subject: `Appointment Confirmed: ${appointment.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">📅 Appointment Booked</h2>
        <p><strong>${appointment.title}</strong></p>
        <p>With: ${mentor.fullName}</p>
        <p>Date: ${new Date(appointment.scheduledAt).toLocaleString()}</p>
        <p>Duration: ${appointment.durationMin} minutes</p>
        ${appointment.meetingLink ? `<p><a href="${appointment.meetingLink}">Join Meeting</a></p>` : ''}
      </div>
    `,
  }),

  ticketUpdate: (ticket, status) => ({
    subject: `Ticket #${ticket.id.slice(0, 8)} - ${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">🎫 Ticket Update</h2>
        <p><strong>${ticket.title}</strong></p>
        <p>Status: ${status}</p>
      </div>
    `,
  }),

  taskGraded: (task, submission) => ({
    subject: `Task Graded: ${task.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">📝 Task Evaluated</h2>
        <p><strong>${task.title}</strong></p>
        <p>Score: ${submission.score}/${task.maxScore}</p>
        ${submission.feedback ? `<p>Feedback: ${submission.feedback}</p>` : ''}
      </div>
    `,
  }),

  newJobPosted: (job) => ({
    subject: `New Job: ${job.title} at ${job.company}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">💼 New Job Posting</h2>
        <p><strong>${job.title}</strong> at ${job.company}</p>
        <p>${job.location || 'Remote'}</p>
        ${job.salaryRange ? `<p>Salary: ${job.salaryRange}</p>` : ''}
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
