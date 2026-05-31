const prisma = require('../db/prisma');

/**
 * Log an audit entry
 * @param {string} actorId - Employee ID performing the action
 * @param {string} action  - e.g. 'UPDATE_SALARY', 'APPROVE_LEAVE'
 * @param {string} entity  - e.g. 'Employee', 'LeaveRequest'
 * @param {string} entityId
 * @param {object} oldValue
 * @param {object} newValue
 */
async function logAudit(actorId, action, entity, entityId, oldValue = null, newValue = null) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue, (_, v) => typeof v === 'bigint' ? v.toString() : v)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue, (_, v) => typeof v === 'bigint' ? v.toString() : v)) : null,
      },
    });
  } catch (err) {
    // Audit log failures should never crash the main request
    console.warn('Audit log failed (non-fatal):', err.message);
  }
}

module.exports = { logAudit };
