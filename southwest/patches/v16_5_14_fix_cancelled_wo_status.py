import frappe


def execute():
	frappe.db.sql("""
		UPDATE `tabService Work Order`
		SET status = 'Cancelled'
		WHERE docstatus = 2 AND status != 'Cancelled'
	""")
	frappe.db.commit()
