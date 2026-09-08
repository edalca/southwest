import frappe
from southwest.startup import custom_fields, property_setters


AGENDA_ROLES = (
	{"role_name": "Agenda User", "desk_access": 0},
	{"role_name": "Agenda Manager", "desk_access": 1},
)


def create_roles():
	for role in AGENDA_ROLES:
		if not frappe.db.exists("Role", role["role_name"]):
			frappe.get_doc({"doctype": "Role", **role}).insert(ignore_permissions=True)


def before_migrate():
	# DocType permissions reference these roles, so they must exist before model sync.
	create_roles()
	frappe.db.commit()


def after_install():
	create_roles()
	custom_fields.create_fields()
	property_setters.apply_property_setters()
	frappe.db.commit()


def before_uninstall():
	custom_fields.delete_fields()
	property_setters.remove_property_setters()
	frappe.db.commit()
