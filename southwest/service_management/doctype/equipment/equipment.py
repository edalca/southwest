import frappe
from frappe.model.document import Document
from southwest.utils.sequence import get_next_sequence


class Equipment(Document):
	def autoname(self):
		"""
		Builds the document name before first insert.
		Format: {customer_code}-{make}/{model}/{serial_no}
		Example: US-Linde/H35T/H21220V04142
		Optional fields (make, model) are omitted gracefully if empty.
		"""
		customer_code = (
			frappe.db.get_value("Customer", self.customer, "custom_customer_code")
			or self.customer
		)

		parts = [p for p in [self.make, self.model, self.serial_no] if p]
		self.name = f"{customer_code}-{'/'.join(parts)}"
