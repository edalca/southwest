import frappe
from frappe import _
from frappe.model.document import Document
from southwest.utils.sequence import get_next_sequence


class ServiceContract(Document):
    def before_insert(self):
        self.contract_number = get_next_sequence(0, 6, "Service Contract")

    def on_submit(self):
        self._create_equipment_assignments()

    def before_cancel(self):
        self._block_if_active_swos()

    def on_cancel(self):
        self._deactivate_equipment_assignments()

    # ── Private helpers ───────────────────────────────────────────────────────

    def _create_equipment_assignments(self):
        """
        Creates one Service Equipment Assignment per row in equipment_details.
        Raises if any row has a duplicate active assignment for the same equipment
        under a different contract that overlaps the same validity period.
        """
        for row in self.equipment_details:
            assignment = frappe.get_doc(
                {
                    "doctype": "Service Equipment Assignment",
                    "customer": self.customer,
                    "equipment": row.equipment,
                    "service_contract": self.name,
                    "status": "Active",
                    "valid_from": self.valid_from,
                    "valid_to": self.valid_to,
                    "pm_frequency": row.pm_frequency,
                    "pm_price_per_visit": row.pm_price_per_visit,
                    "equipment_labor_rate": row.equipment_labor_rate or 0,
                }
            )
            assignment.insert(ignore_permissions=True)

        frappe.msgprint(
            _("{0} equipment assignment(s) created.").format(len(self.equipment_details)),
            indicator="green",
            alert=True,
        )

    def _block_if_active_swos(self):
        """Prevent cancellation when active Work Orders exist for any equipment in this contract."""
        equipments = [row.equipment for row in self.equipment_details if row.equipment]
        if not equipments:
            return

        active_statuses = ("New", "Programmed", "Repairing", "Partial Repair", "Staged")

        rows = frappe.db.sql(
            """
            SELECT DISTINCT swo.name, swo.work_order_number, swo.status, swoe.equipment
            FROM `tabService Work Order` swo
            INNER JOIN `tabService Work Order Equipment` swoe ON swoe.parent = swo.name
            WHERE swo.customer = %(customer)s
                AND swoe.equipment IN %(equipments)s
                AND swo.status IN %(statuses)s
                AND swo.docstatus = 0
            """,
            {
                "customer": self.customer,
                "equipments": equipments,
                "statuses": active_statuses,
            },
            as_dict=True,
        )

        if rows:
            detail = "<br>".join(
                "• {0} ({1}) — {2}".format(r.work_order_number or r.name, r.equipment, _(r.status))
                for r in rows
            )
            frappe.throw(
                _(
                    "Cannot cancel this contract. The following active Work Orders must be "
                    "cancelled first:<br><br>{0}"
                ).format(detail),
                title=_("Active Work Orders Exist"),
            )

    def _deactivate_equipment_assignments(self):
        """
        Sets all Service Equipment Assignments linked to this contract to Inactive.
        Records are retained for historical traceability.
        """
        assignments = frappe.get_all(
            "Service Equipment Assignment",
            filters={"service_contract": self.name},
            pluck="name",
        )

        for name in assignments:
            frappe.db.set_value("Service Equipment Assignment", name, "status", "Inactive")

        if assignments:
            frappe.msgprint(
                _("{0} equipment assignment(s) set to Inactive.").format(len(assignments)),
                indicator="orange",
                alert=True,
            )
