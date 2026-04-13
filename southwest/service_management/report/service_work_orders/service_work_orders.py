import frappe
from frappe import _


def execute(filters=None):
    filters = filters or {}
    return get_columns(), get_data(filters)


def get_columns():
    return [
        {
            "label": _("Work Order"),
            "fieldname": "name",
            "fieldtype": "Link",
            "options": "Service Work Order",
            "width": 160,
        },
        {
            "label": _("Status"),
            "fieldname": "status",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": _("Customer"),
            "fieldname": "customer",
            "fieldtype": "Link",
            "options": "Customer",
            "width": 160,
        },
        {
            "label": _("Service Type"),
            "fieldname": "service_type",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": _("Scheduled Date"),
            "fieldname": "scheduled_date",
            "fieldtype": "Date",
            "width": 120,
        },
        {
            "label": _("Hour Meter"),
            "fieldname": "hour_meter",
            "fieldtype": "Data",
            "width": 100,
        },
        {
            "label": _("Total Repair Time (hrs)"),
            "fieldname": "total_repair_time",
            "fieldtype": "Float",
            "width": 140,
        },
        {
            "label": _("Service Cost"),
            "fieldname": "service_cost",
            "fieldtype": "Currency",
            "width": 120,
        },
        {
            "label": _("PO Number"),
            "fieldname": "po_number",
            "fieldtype": "Data",
            "width": 140,
        },
    ]


def get_data(filters):
    conditions = build_conditions(filters)

    return frappe.db.sql(
        f"""
        SELECT
            name,
            status,
            customer,
            service_type,
            scheduled_date,
            hour_meter,
            total_repair_time,
            service_cost,
            po_number
        FROM
            `tabService Work Order`
        WHERE
            {conditions}
        ORDER BY
            scheduled_date DESC, creation DESC
        """,
        filters,
        as_dict=1,
    )


def build_conditions(filters):
    conditions = ["1=1"]

    if filters.get("from_date"):
        conditions.append("(scheduled_date >= %(from_date)s OR scheduled_date IS NULL)")
    if filters.get("to_date"):
        conditions.append("(scheduled_date <= %(to_date)s OR scheduled_date IS NULL)")
    if filters.get("status"):
        conditions.append("status = %(status)s")
    if filters.get("customer"):
        conditions.append("customer = %(customer)s")
    if filters.get("service_type"):
        conditions.append("service_type = %(service_type)s")
    return " AND ".join(conditions)
