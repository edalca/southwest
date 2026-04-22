import frappe

login_required = True
no_cache = 1


def get_context(context):
    name = frappe.local.form_dict.get("name")
    if not name:
        frappe.throw("Work Order name is required.")

    doc = frappe.get_doc("Service Work Order", name)
    frappe.has_permission("Service Work Order", doc=doc, throw=True)

    if doc.status not in ("Staged", "Completed"):
        frappe.throw("PDF is only available for Staged or Completed work orders.")

    letter_head = (
        frappe.db.get_single_value("Service Manager Settings", "app_pdf_letter_head") or ""
    )

    pdf = frappe.get_print(
        "Service Work Order",
        name,
        "Service Work Order",
        as_pdf=True,
        letterhead=letter_head or None,
        no_letterhead=not bool(letter_head),
    )

    frappe.local.response.type = "pdf"
    frappe.local.response.filecontent = pdf
    frappe.local.response.filename = f"Work-Order-{name}.pdf"
