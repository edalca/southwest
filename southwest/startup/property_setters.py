import frappe


def apply_property_setters():
	for ps in get_property_setters():
		frappe.make_property_setter(ps, ignore_validate=True)


def remove_property_setters():
	for ps in get_property_setters():
		name = "{}-{}-{}".format(ps["doctype"], ps.get("fieldname") or "main", ps["property"])
		if frappe.db.exists("Property Setter", name):
			frappe.delete_doc("Property Setter", name, ignore_permissions=True)


def get_property_setters():
	return [
		{
			"doctype": "Employee",
			"doctype_or_field": "DocType",
			"property": "show_title_field_in_link",
			"value": "1",
			"property_type": "Check",
		},
		# Hide source link fields on Sales Invoice — internal tracking only
		{
			"doctype": "Sales Invoice",
			"fieldname": "custom_source_doctype",
			"doctype_or_field": "DocField",
			"property": "hidden",
			"value": "1",
			"property_type": "Check",
		},
		{
			"doctype": "Sales Invoice",
			"fieldname": "custom_source_document",
			"doctype_or_field": "DocField",
			"property": "hidden",
			"value": "1",
			"property_type": "Check",
		},
	]
