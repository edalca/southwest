import frappe
from frappe import _
from frappe.model.document import Document


class ServicePartAssignment(Document):
	def validate(self):
		if self.item_code and self.status == "Pending":
			self.status = "Assigned"
		elif not self.item_code and self.status == "Assigned":
			frappe.throw(_("Item Code is required to mark this assignment as Assigned."))
