import frappe
from frappe.utils import now_datetime


def execute():
	for entry in frappe.get_all("Agenda Entry", fields=["name", "owner"]):
		if not entry.owner or frappe.db.exists(
			"Agenda Entry Subscriber",
			{"parent": entry.name, "user": entry.owner},
		):
			continue

		doc = frappe.get_doc("Agenda Entry", entry.name)
		doc.append(
			"subscribers",
			{"user": entry.owner, "added_by": entry.owner, "added_on": now_datetime()},
		)
		doc.save(ignore_permissions=True)
