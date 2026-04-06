import frappe
from southwest.startup import custom_fields, property_setters


def after_install():
	custom_fields.create_fields()
	property_setters.apply_property_setters()
	frappe.db.commit()


def before_uninstall():
	custom_fields.delete_fields()
	property_setters.remove_property_setters()
	frappe.db.commit()
