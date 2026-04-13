# Copyright (c) 2026, Edwin Carrillo and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CustomerPOAssignment(Document):
	def on_update(self):
		"""Syncs the PO Number to the Customer if this is the active record."""
		if self.is_active:
			customer = frappe.get_doc("Customer", self.customer)
			if customer.custom_current_active_po != self.po_number:
				customer.custom_current_active_po = self.po_number
				customer.save(ignore_permissions=True)
