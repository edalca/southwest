import frappe
from southwest.utils.sequence import get_next_sequence


def before_insert(doc, method=None):
    """
    Assigns a company-scoped numeric sequence to custom_company_sequence before
    the Sales Invoice is inserted into the database.
    """
    doc.custom_company_sequence = get_next_sequence(0, 7, doc.doctype, doc.company)


def validate(doc, method=None):
	if doc.custom_source_doctype != "Service Work Order":
		return
	has_labor = any(item.custom_is_labor_item for item in doc.items)
	if not has_labor:
		frappe.throw("A Sales Invoice from a Service Work Order must have at least one labor item.")


def on_submit(doc, method=None):
	"""
	When a Sales Invoice linked to a Service Work Order is submitted,
	triggers the final status update logic for the work order.
	"""
	if doc.custom_source_doctype == "Service Work Order" and doc.custom_source_document:
		from southwest.service_management.doctype.service_work_order.service_work_order import update_swo_final_status
		update_swo_final_status(doc.custom_source_document)
