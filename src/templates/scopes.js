const scopeTemplates = {
  'flight-rebooking': {
    default_permissions: [
      'read_bookings',
      'search_alternatives',
      'request_rebooking',
      'charge_payment_on_file',
    ],
    default_exclusions: [
      'loyalty_transfers',
      'personal_documents',
      'e_credit_access',
      'account_changes',
    ],
  },
  'prescription-refill': {
    default_permissions: [
      'read_prescriptions',
      'request_refill',
      'confirm_pharmacy',
    ],
    default_exclusions: [
      'medical_records',
      'insurance_details',
      'provider_notes',
    ],
  },
};

function getTemplate(scope) {
  return scopeTemplates[scope] || null;
}

function getAllTemplates() {
  return scopeTemplates;
}

module.exports = {
  getTemplate,
  getAllTemplates,
};
