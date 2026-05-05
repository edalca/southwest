doc = frappe.get_doc("Service Work Order", "WO-26-0000078")
doc.db_set("service_cost", 90.50)
frappe.db.commit()
print("service_cost updated to:", frappe.db.get_value("Service Work Order", "WO-26-0000078", "service_cost"))
