import frappe
from southwest.service_management.doctype.service_work_order.service_work_order import update_swo_final_status


def on_submit(doc, method):
	"""
	Hooked from hooks.py. Triggers SWO status update when a Stock Entry
	is submitted, if it was generated from an SWO.
	"""
	if doc.custom_source_doctype == "Service Work Order" and doc.custom_source_document:
		update_swo_final_status(doc.custom_source_document)
