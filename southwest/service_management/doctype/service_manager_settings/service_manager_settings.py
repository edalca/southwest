import frappe
from frappe import _
from frappe.model.document import Document


class ServiceManagerSettings(Document):
	def validate(self):
		self._validate_unique_service_type_config()

	def _validate_unique_service_type_config(self):
		seen = set()
		for row in self.print_equipment_type_for or []:
			if row.service_type in seen:
				frappe.throw(
					_("Duplicate service type '{0}' in Print Equipment Type For. Each type can only appear once.").format(
						row.service_type
					)
				)
			seen.add(row.service_type)
