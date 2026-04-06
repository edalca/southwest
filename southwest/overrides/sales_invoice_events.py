import frappe
from southwest.utils.sequence import get_next_sequence


def before_insert(doc, method=None):
    """
    Assigns a company-scoped numeric sequence to custom_company_sequence before
    the Sales Invoice is inserted into the database.
    """
    doc.custom_company_sequence = get_next_sequence(0, 7, doc.doctype, doc.company)


def on_submit(doc, method=None):
    """
    When a Sales Invoice linked to a Service Work Order is submitted,
    updates the work order status to Invoiced.
    """
    if doc.custom_source_doctype == "Service Work Order" and doc.custom_source_document:
        frappe.db.set_value(
            "Service Work Order", doc.custom_source_document, "status", "Invoiced"
        )
