const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Dayflow HRMS';

// ─── Welcome Email for New Employee ──────────────────────────────────────────
async function sendNewEmployeeEmail({ email, firstName, lastName, loginId, password }) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Welcome to ${APP_NAME} — Your Account is Ready`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:24px;color:#fff">🗓️ ${APP_NAME}</h1>
          <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px">Every workday, perfectly aligned.</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#a78bfa;margin:0 0 16px">Welcome, ${firstName}! 🎉</h2>
          <p style="color:#94a3b8;line-height:1.6">Your employee account has been created. Here are your login credentials:</p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px">Login Credentials</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>Login ID:</strong> <code style="color:#a78bfa">${loginId}</code></p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>Email:</strong> <code style="color:#a78bfa">${email}</code></p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>Password:</strong> <code style="color:#a78bfa">${password}</code></p>
          </div>
          <p style="color:#ef4444;font-size:13px">⚠️ Please change your password after your first login.</p>
          <p style="color:#64748b;font-size:12px;margin-top:32px">— The ${APP_NAME} Team</p>
        </div>
      </div>
    `,
  });
}

// ─── Leave Request Email (to Admin) ──────────────────────────────────────────
async function sendLeaveRequestEmail({ to, adminName, employeeName, leaveType, startDate, endDate }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Leave Request from ${employeeName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px;text-align:center">
          <h1 style="margin:0;font-size:20px;color:#fff">🗓️ ${APP_NAME}</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#fbbf24;margin:0 0 16px">📋 New Leave Request</h2>
          <p style="color:#94a3b8">Hi <strong>${adminName}</strong>, a new leave request needs your attention:</p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin:20px 0">
            <p style="margin:4px 0;color:#f1f5f9"><strong>Employee:</strong> ${employeeName}</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>Type:</strong> ${leaveType}</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>From:</strong> ${startDate}</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>To:</strong> ${endDate}</p>
          </div>
          <p style="color:#64748b;font-size:12px;margin-top:32px">Please log in to approve or reject this request.</p>
        </div>
      </div>
    `,
  });
}

// ─── Leave Status Email (to Employee) ────────────────────────────────────────
async function sendLeaveStatusEmail({ to, employeeName, leaveType, status, adminComment, startDate, endDate }) {
  const isApproved = status === 'APPROVED';
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your Leave Request has been ${isApproved ? 'Approved ✅' : 'Rejected ❌'}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,${isApproved ? '#16a34a,#15803d' : '#dc2626,#b91c1c'});padding:24px;text-align:center">
          <h1 style="margin:0;font-size:20px;color:#fff">🗓️ ${APP_NAME}</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:${isApproved ? '#4ade80' : '#f87171'};margin:0 0 16px">
            ${isApproved ? '✅ Leave Approved' : '❌ Leave Rejected'}
          </h2>
          <p style="color:#94a3b8">Hi <strong>${employeeName}</strong>, your leave request has been reviewed:</p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin:20px 0">
            <p style="margin:4px 0;color:#f1f5f9"><strong>Type:</strong> ${leaveType}</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>From:</strong> ${new Date(startDate).toDateString()}</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>To:</strong> ${new Date(endDate).toDateString()}</p>
            <p style="margin:4px 0;color:#f1f5f9"><strong>Status:</strong> <span style="color:${isApproved ? '#4ade80' : '#f87171'}">${status}</span></p>
            ${adminComment ? `<p style="margin:4px 0;color:#f1f5f9"><strong>Comment:</strong> ${adminComment}</p>` : ''}
          </div>
          <p style="color:#64748b;font-size:12px;margin-top:32px">— The ${APP_NAME} Team</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendNewEmployeeEmail, sendLeaveRequestEmail, sendLeaveStatusEmail };
