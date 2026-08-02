import frappe
from frappe import _
from frappe.model.document import Document

#: Used when the setting is unset, so the attach controls always have a usable cap.
DEFAULT_MAX_PART_ATTACHMENTS = 5


def get_max_part_attachments() -> int:
	"""Returns how many files may be attached to a single Service Work Order part row."""
	value = frappe.db.get_single_value("Service Manager Settings", "max_part_attachments")
	return int(value) if value and int(value) > 0 else DEFAULT_MAX_PART_ATTACHMENTS


class ServiceManagerSettings(Document):
	def validate(self):
		self._validate_unique_service_type_config()
		self._validate_max_part_attachments()

	def _validate_max_part_attachments(self):
		"""A row must allow at least one file, otherwise the attach controls are unusable."""
		if not self.max_part_attachments:
			self.max_part_attachments = DEFAULT_MAX_PART_ATTACHMENTS
		elif self.max_part_attachments < 1:
			frappe.throw(_("Max Attachments Per Part must be at least 1."))

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
