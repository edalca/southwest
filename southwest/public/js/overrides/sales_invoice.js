frappe.ui.form.on("Sales Invoice", {
	refresh(frm) {
		_lock_swo_fields(frm);
		_set_item_queries(frm);
	},

	customer(frm) {
		if (frm.doc.custom_source_doctype === "Service Work Order") return;
		if (!frm.doc.customer) return;
		frappe.call({
			method: "southwest.api.get_active_customer_po",
			args: { customer: frm.doc.customer },
			callback(r) {
				if (r.message) frm.set_value("custom_po_number", r.message);
			},
		});
	},
});

frappe.ui.form.on("Sales Invoice Item", {
	custom_work_order(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "custom_equipment", "");
		if (!row.custom_work_order) return;

		frappe.call({
			method: "southwest.api.get_swo_info",
			args: { swo_name: row.custom_work_order },
			callback(r) {
				if (!r.message) return;
				const { service_type, equipment } = r.message;
				if (service_type !== "Misc" || equipment.length === 1) {
					frappe.model.set_value(cdt, cdn, "custom_equipment", equipment[0] || "");
				}
			},
		});
	},
});

/**
 * When this Sales Invoice was generated from a Service Work Order,
 * force update_stock = 1 and make it read-only so users cannot
 * accidentally uncheck it or change the stock posting flag.
 */
function _lock_swo_fields(frm) {
	if (frm.doc.custom_source_doctype !== "Service Work Order") return;

	frm.set_value("update_stock", 1);
	frm.set_df_property("update_stock", "read_only", 1);
}

function _set_item_queries(frm) {
	frm.set_query("custom_work_order", "items", function () {
		const filters = { status: "Closed" };
		if (frm.doc.customer) filters.customer = frm.doc.customer;
		return { filters };
	});

	frm.set_query("custom_equipment", "items", function (doc, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.custom_work_order) return {};
		return {
			query: "southwest.api.get_swo_equipment_search",
			filters: { work_order: row.custom_work_order },
		};
	});
}
