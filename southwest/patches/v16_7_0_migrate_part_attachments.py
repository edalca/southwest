import json

import frappe


def execute():
	"""
	Moves single-file part attachments into the multi-file `attachments` list.

	The old `attachment` column is left in place: Frappe does not drop columns for
	removed fields, so the data stays recoverable until `bench trim-database` runs.
	"""
	if not frappe.db.has_column("Service Work Order Item", "attachment"):
		return

	rows = frappe.db.sql(
		"""
		SELECT name, attachment
		FROM `tabService Work Order Item`
		WHERE ifnull(attachment, '') != '' AND ifnull(attachments, '') = ''
		""",
		as_dict=True,
	)

	for row in rows:
		frappe.db.set_value(
			"Service Work Order Item",
			row.name,
			{"attachments": json.dumps([row.attachment]), "attachment_count": 1},
			update_modified=False,
		)

	frappe.db.commit()
